"use server";

import { revalidatePath } from "next/cache";
import { eq, and, ilike, count, sum, avg } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  menu,
  menuProduct,
  menuFee,
  fixedCost,
  product,
} from "@/lib/db/schema";
import { requireSession } from "@/lib/session";
import { getWorkspaceBySlug } from "./workspace";
import { generateId } from "@/lib/utils/id";

export interface MenusFilters {
  search?: string;
  status?: "active" | "inactive";
  page?: number;
  perPage?: number;
}

export async function getMenus(workspaceSlug: string, filters?: MenusFilters) {
  await requireSession();
  const workspace = await getWorkspaceBySlug(workspaceSlug);

  if (!workspace) {
    throw new Error("Workspace not found");
  }

  const page = filters?.page || 1;
  const perPage = filters?.perPage || 15;
  const offset = (page - 1) * perPage;

  // Build conditions
  const conditions = [eq(menu.workspaceId, workspace.id)];

  if (filters?.search) {
    conditions.push(ilike(menu.name, `%${filters.search}%`));
  }

  if (filters?.status === "active") {
    conditions.push(eq(menu.active, true));
  } else if (filters?.status === "inactive") {
    conditions.push(eq(menu.active, false));
  }

  const whereClause = and(...conditions);

  // Get total count
  const totalResult = await db
    .select({ count: count() })
    .from(menu)
    .where(whereClause);

  const total = totalResult[0]?.count || 0;

  const menus = await db
    .select({
      id: menu.id,
      name: menu.name,
      description: menu.description,
      active: menu.active,
      createdAt: menu.createdAt,
    })
    .from(menu)
    .where(whereClause)
    .orderBy(menu.name)
    .limit(perPage)
    .offset(offset);

  // Get metrics for each menu
  const menusWithMetrics = await Promise.all(
    menus.map(async (m) => {
      // Get aggregated product metrics
      const metrics = await db
        .select({
          productCount: count(),
          totalRevenue: sum(menuProduct.salePrice),
          totalCost: sum(menuProduct.totalCost),
          totalMargin: sum(menuProduct.marginValue),
          avgMarginPercentage: avg(menuProduct.marginPercentage),
        })
        .from(menuProduct)
        .where(eq(menuProduct.menuId, m.id));

      // Get fees count
      const feesResult = await db
        .select({ count: count() })
        .from(menuFee)
        .where(and(eq(menuFee.menuId, m.id), eq(menuFee.active, true)));

      const productCount = metrics[0]?.productCount ?? 0;
      const totalRevenue = parseFloat(metrics[0]?.totalRevenue || "0");
      const totalCost = parseFloat(metrics[0]?.totalCost || "0");
      const totalMargin = parseFloat(metrics[0]?.totalMargin || "0");
      const avgMargin = parseFloat(metrics[0]?.avgMarginPercentage || "0");
      const feesCount = feesResult[0]?.count ?? 0;

      return {
        ...m,
        productCount,
        totalRevenue,
        totalCost,
        totalMargin,
        avgMarginPercentage: avgMargin,
        feesCount,
      };
    })
  );

  return {
    menus: menusWithMetrics,
    pagination: {
      page,
      perPage,
      total,
      totalPages: Math.ceil(total / perPage),
    },
  };
}

export async function getMenu(workspaceSlug: string, menuId: string) {
  await requireSession();
  const workspace = await getWorkspaceBySlug(workspaceSlug);

  if (!workspace) {
    throw new Error("Workspace not found");
  }

  const result = await db
    .select({
      id: menu.id,
      name: menu.name,
      description: menu.description,
      active: menu.active,
      apportionmentType: menu.apportionmentType,
      apportionmentValue: menu.apportionmentValue,
      createdAt: menu.createdAt,
      updatedAt: menu.updatedAt,
    })
    .from(menu)
    .where(and(eq(menu.id, menuId), eq(menu.workspaceId, workspace.id)));

  return result[0] || null;
}

export async function createMenu(workspaceSlug: string, formData: FormData) {
  await requireSession();
  const workspace = await getWorkspaceBySlug(workspaceSlug);

  if (!workspace) {
    return { error: "Workspace não encontrado" };
  }

  const name = formData.get("name") as string;
  const description = formData.get("description") as string | null;
  const active = formData.get("active") !== "false";

  if (!name) {
    return { error: "Nome é obrigatório" };
  }

  const id = generateId("menu");

  await db.insert(menu).values({
    id,
    workspaceId: workspace.id,
    name: name.trim(),
    description: description?.trim() || null,
    active,
  });

  revalidatePath(`/${workspaceSlug}/menus`);
  return { success: true, id };
}

export async function updateMenu(
  workspaceSlug: string,
  menuId: string,
  formData: FormData
) {
  await requireSession();
  const workspace = await getWorkspaceBySlug(workspaceSlug);

  if (!workspace) {
    return { error: "Workspace não encontrado" };
  }

  const name = formData.get("name") as string;
  const description = formData.get("description") as string | null;
  const active = formData.get("active") !== "false";

  if (!name) {
    return { error: "Nome é obrigatório" };
  }

  await db
    .update(menu)
    .set({
      name: name.trim(),
      description: description?.trim() || null,
      active,
      updatedAt: new Date(),
    })
    .where(and(eq(menu.id, menuId), eq(menu.workspaceId, workspace.id)));

  revalidatePath(`/${workspaceSlug}/menus`);
  revalidatePath(`/${workspaceSlug}/menus/${menuId}`);
  return { success: true };
}

export async function deleteMenu(workspaceSlug: string, menuId: string) {
  await requireSession();
  const workspace = await getWorkspaceBySlug(workspaceSlug);

  if (!workspace) {
    return { error: "Workspace não encontrado" };
  }

  await db
    .delete(menu)
    .where(and(eq(menu.id, menuId), eq(menu.workspaceId, workspace.id)));

  revalidatePath(`/${workspaceSlug}/menus`);
  return { success: true };
}

// Menu Products
export async function getMenuProducts(menuId: string) {
  await requireSession();

  const items = await db
    .select({
      id: menuProduct.id,
      productId: menuProduct.productId,
      productName: product.name,
      productBaseCost: product.baseCost,
      salePrice: menuProduct.salePrice,
      totalCost: menuProduct.totalCost,
      marginValue: menuProduct.marginValue,
      marginPercentage: menuProduct.marginPercentage,
    })
    .from(menuProduct)
    .innerJoin(product, eq(menuProduct.productId, product.id))
    .where(eq(menuProduct.menuId, menuId));

  return items;
}

export async function addMenuProduct(
  workspaceSlug: string,
  menuId: string,
  formData: FormData
) {
  await requireSession();
  const workspace = await getWorkspaceBySlug(workspaceSlug);

  if (!workspace) {
    return { error: "Workspace não encontrado" };
  }

  const productId = formData.get("productId") as string;
  const salePrice = formData.get("salePrice") as string;

  if (!productId || !salePrice) {
    return { error: "Produto e preço de venda são obrigatórios" };
  }

  // Check if product is already in menu
  const existing = await db
    .select({ id: menuProduct.id })
    .from(menuProduct)
    .where(and(eq(menuProduct.menuId, menuId), eq(menuProduct.productId, productId)));

  if (existing.length > 0) {
    return { error: "Produto já está no cardápio" };
  }

  // Get product base cost
  const prod = await db
    .select({ baseCost: product.baseCost })
    .from(product)
    .where(eq(product.id, productId));

  if (!prod[0]) {
    return { error: "Produto não encontrado" };
  }

  const baseCost = parseFloat(prod[0].baseCost);
  const salePriceNum = parseFloat(salePrice);

  // Get menu fees to calculate total cost
  const fees = await db
    .select({
      type: menuFee.type,
      value: menuFee.value,
      active: menuFee.active,
    })
    .from(menuFee)
    .where(eq(menuFee.menuId, menuId));

  // Calculate fees cost
  let feesCost = 0;
  for (const fee of fees) {
    if (!fee.active) continue;
    if (fee.type === "fixed") {
      feesCost += parseFloat(fee.value);
    } else {
      // percentage of sale price
      feesCost += salePriceNum * (parseFloat(fee.value) / 100);
    }
  }

  // Get menu apportionment settings
  const menuData = await db
    .select({
      apportionmentType: menu.apportionmentType,
      apportionmentValue: menu.apportionmentValue,
    })
    .from(menu)
    .where(eq(menu.id, menuId));

  const apportionmentType = menuData[0]?.apportionmentType || "proportional_to_sales";
  const apportionmentValue = parseFloat(menuData[0]?.apportionmentValue || "0");

  // Get ALL active fixed costs from workspace
  const workspaceFixedCosts = await db
    .select({ value: fixedCost.value })
    .from(fixedCost)
    .where(and(eq(fixedCost.workspaceId, workspace.id), eq(fixedCost.active, true)));

  const totalMonthlyFixedCost = workspaceFixedCosts.reduce(
    (sum, fc) => sum + parseFloat(fc.value),
    0
  );

  // Calculate fixed costs apportionment
  let fixedCostApportionment = 0;
  if (totalMonthlyFixedCost > 0 && apportionmentValue > 0) {
    switch (apportionmentType) {
      case "percentage_of_sale":
        fixedCostApportionment = salePriceNum * (apportionmentValue / 100);
        break;
      case "fixed_per_product":
        fixedCostApportionment = apportionmentValue;
        break;
      case "proportional_to_sales":
        fixedCostApportionment = totalMonthlyFixedCost / apportionmentValue;
        break;
    }
  }

  const totalCost = baseCost + feesCost + fixedCostApportionment;
  const marginValue = salePriceNum - totalCost;
  const marginPercentage = salePriceNum > 0 ? (marginValue / salePriceNum) * 100 : 0;

  const id = generateId("mp");

  await db.insert(menuProduct).values({
    id,
    menuId,
    productId,
    salePrice: salePriceNum.toFixed(4),
    totalCost: totalCost.toFixed(4),
    marginValue: marginValue.toFixed(4),
    marginPercentage: marginPercentage.toFixed(4),
  });

  revalidatePath(`/${workspaceSlug}/menus/${menuId}`);
  return { success: true, id };
}

export async function updateMenuProduct(
  workspaceSlug: string,
  menuId: string,
  menuProductId: string,
  formData: FormData
) {
  await requireSession();
  const workspace = await getWorkspaceBySlug(workspaceSlug);

  if (!workspace) {
    return { error: "Workspace não encontrado" };
  }

  const salePrice = formData.get("salePrice") as string;

  if (!salePrice) {
    return { error: "Preço de venda é obrigatório" };
  }

  // Get current menu product to get productId
  const current = await db
    .select({ productId: menuProduct.productId })
    .from(menuProduct)
    .where(eq(menuProduct.id, menuProductId));

  if (!current[0]) {
    return { error: "Item não encontrado" };
  }

  // Get product base cost
  const prod = await db
    .select({ baseCost: product.baseCost })
    .from(product)
    .where(eq(product.id, current[0].productId));

  if (!prod[0]) {
    return { error: "Produto não encontrado" };
  }

  const baseCost = parseFloat(prod[0].baseCost);
  const salePriceNum = parseFloat(salePrice);

  // Get menu fees to calculate total cost
  const fees = await db
    .select({
      type: menuFee.type,
      value: menuFee.value,
      active: menuFee.active,
    })
    .from(menuFee)
    .where(eq(menuFee.menuId, menuId));

  // Calculate fees cost
  let feesCost = 0;
  for (const fee of fees) {
    if (!fee.active) continue;
    if (fee.type === "fixed") {
      feesCost += parseFloat(fee.value);
    } else {
      feesCost += salePriceNum * (parseFloat(fee.value) / 100);
    }
  }

  // Get menu apportionment settings
  const menuData = await db
    .select({
      apportionmentType: menu.apportionmentType,
      apportionmentValue: menu.apportionmentValue,
    })
    .from(menu)
    .where(eq(menu.id, menuId));

  const apportionmentType = menuData[0]?.apportionmentType || "proportional_to_sales";
  const apportionmentValue = parseFloat(menuData[0]?.apportionmentValue || "0");

  // Get ALL active fixed costs from workspace
  const workspaceFixedCosts = await db
    .select({ value: fixedCost.value })
    .from(fixedCost)
    .where(and(eq(fixedCost.workspaceId, workspace.id), eq(fixedCost.active, true)));

  const totalMonthlyFixedCost = workspaceFixedCosts.reduce(
    (sum, fc) => sum + parseFloat(fc.value),
    0
  );

  // Calculate fixed costs apportionment
  let fixedCostApportionment = 0;
  if (totalMonthlyFixedCost > 0 && apportionmentValue > 0) {
    switch (apportionmentType) {
      case "percentage_of_sale":
        fixedCostApportionment = salePriceNum * (apportionmentValue / 100);
        break;
      case "fixed_per_product":
        fixedCostApportionment = apportionmentValue;
        break;
      case "proportional_to_sales":
        fixedCostApportionment = totalMonthlyFixedCost / apportionmentValue;
        break;
    }
  }

  const totalCost = baseCost + feesCost + fixedCostApportionment;
  const marginValue = salePriceNum - totalCost;
  const marginPercentage = salePriceNum > 0 ? (marginValue / salePriceNum) * 100 : 0;

  await db
    .update(menuProduct)
    .set({
      salePrice: salePriceNum.toFixed(4),
      totalCost: totalCost.toFixed(4),
      marginValue: marginValue.toFixed(4),
      marginPercentage: marginPercentage.toFixed(4),
      updatedAt: new Date(),
    })
    .where(eq(menuProduct.id, menuProductId));

  revalidatePath(`/${workspaceSlug}/menus/${menuId}`);
  return { success: true };
}

export async function removeMenuProduct(
  workspaceSlug: string,
  menuId: string,
  menuProductId: string
) {
  await requireSession();

  await db.delete(menuProduct).where(eq(menuProduct.id, menuProductId));

  revalidatePath(`/${workspaceSlug}/menus/${menuId}`);
  return { success: true };
}

// Menu Fees
export async function getMenuFees(menuId: string) {
  await requireSession();

  const fees = await db
    .select({
      id: menuFee.id,
      name: menuFee.name,
      type: menuFee.type,
      value: menuFee.value,
      active: menuFee.active,
    })
    .from(menuFee)
    .where(eq(menuFee.menuId, menuId));

  return fees;
}

export async function addMenuFee(
  workspaceSlug: string,
  menuId: string,
  formData: FormData
) {
  await requireSession();

  const name = formData.get("name") as string;
  const type = formData.get("type") as "fixed" | "percentage";
  const value = formData.get("value") as string;

  if (!name || !type || !value) {
    return { error: "Todos os campos são obrigatórios" };
  }

  const id = generateId("mf");

  await db.insert(menuFee).values({
    id,
    menuId,
    name: name.trim(),
    type,
    value,
    active: true,
  });

  // Recalculate all products in this menu
  await recalculateMenuProductsCosts(workspaceSlug, menuId);

  revalidatePath(`/${workspaceSlug}/menus/${menuId}`);
  return { success: true, id };
}

export async function updateMenuFee(
  workspaceSlug: string,
  menuId: string,
  feeId: string,
  formData: FormData
) {
  await requireSession();

  const name = formData.get("name") as string;
  const type = formData.get("type") as "fixed" | "percentage";
  const value = formData.get("value") as string;
  const active = formData.get("active") === "true";

  if (!name || !type || !value) {
    return { error: "Todos os campos são obrigatórios" };
  }

  await db
    .update(menuFee)
    .set({
      name: name.trim(),
      type,
      value,
      active,
      updatedAt: new Date(),
    })
    .where(eq(menuFee.id, feeId));

  // Recalculate all products in this menu
  await recalculateMenuProductsCosts(workspaceSlug, menuId);

  revalidatePath(`/${workspaceSlug}/menus/${menuId}`);
  return { success: true };
}

export async function removeMenuFee(
  workspaceSlug: string,
  menuId: string,
  feeId: string
) {
  await requireSession();

  await db.delete(menuFee).where(eq(menuFee.id, feeId));

  // Recalculate all products in this menu
  await recalculateMenuProductsCosts(workspaceSlug, menuId);

  revalidatePath(`/${workspaceSlug}/menus/${menuId}`);
  return { success: true };
}

// Helper: Recalculate all products costs when fees or fixed costs change
async function recalculateMenuProductsCosts(workspaceSlug: string, menuId: string) {
  const workspace = await getWorkspaceBySlug(workspaceSlug);
  if (!workspace) return;

  const products = await db
    .select({
      id: menuProduct.id,
      productId: menuProduct.productId,
      salePrice: menuProduct.salePrice,
    })
    .from(menuProduct)
    .where(eq(menuProduct.menuId, menuId));

  const fees = await db
    .select({
      type: menuFee.type,
      value: menuFee.value,
      active: menuFee.active,
    })
    .from(menuFee)
    .where(eq(menuFee.menuId, menuId));

  // Get menu apportionment settings
  const menuData = await db
    .select({
      apportionmentType: menu.apportionmentType,
      apportionmentValue: menu.apportionmentValue,
    })
    .from(menu)
    .where(eq(menu.id, menuId));

  const apportionmentType = menuData[0]?.apportionmentType || "proportional_to_sales";
  const apportionmentValue = parseFloat(menuData[0]?.apportionmentValue || "0");

  // Get ALL active fixed costs from workspace
  const workspaceFixedCosts = await db
    .select({
      value: fixedCost.value,
    })
    .from(fixedCost)
    .where(and(eq(fixedCost.workspaceId, workspace.id), eq(fixedCost.active, true)));

  const totalMonthlyFixedCost = workspaceFixedCosts.reduce(
    (sum, fc) => sum + parseFloat(fc.value),
    0
  );

  for (const mp of products) {
    const prod = await db
      .select({ baseCost: product.baseCost })
      .from(product)
      .where(eq(product.id, mp.productId));

    if (!prod[0]) continue;

    const baseCost = parseFloat(prod[0].baseCost);
    const salePriceNum = parseFloat(mp.salePrice);

    // Calculate fees cost
    let feesCost = 0;
    for (const fee of fees) {
      if (!fee.active) continue;
      if (fee.type === "fixed") {
        feesCost += parseFloat(fee.value);
      } else {
        feesCost += salePriceNum * (parseFloat(fee.value) / 100);
      }
    }

    // Calculate fixed costs apportionment
    let fixedCostApportionment = 0;
    if (totalMonthlyFixedCost > 0 && apportionmentValue > 0) {
      switch (apportionmentType) {
        case "percentage_of_sale":
          fixedCostApportionment = salePriceNum * (apportionmentValue / 100);
          break;
        case "fixed_per_product":
          fixedCostApportionment = apportionmentValue;
          break;
        case "proportional_to_sales":
          fixedCostApportionment = totalMonthlyFixedCost / apportionmentValue;
          break;
      }
    }

    const totalCost = baseCost + feesCost + fixedCostApportionment;
    const marginValue = salePriceNum - totalCost;
    const marginPercentage = salePriceNum > 0 ? (marginValue / salePriceNum) * 100 : 0;

    await db
      .update(menuProduct)
      .set({
        totalCost: totalCost.toFixed(4),
        marginValue: marginValue.toFixed(4),
        marginPercentage: marginPercentage.toFixed(4),
        updatedAt: new Date(),
      })
      .where(eq(menuProduct.id, mp.id));
  }
}

// Get available products for menu (not already in this menu)
export async function getAvailableProductsForMenu(workspaceSlug: string, menuId: string) {
  await requireSession();
  const workspace = await getWorkspaceBySlug(workspaceSlug);

  if (!workspace) {
    return [];
  }

  // Get products already in menu
  const existingProducts = await db
    .select({ productId: menuProduct.productId })
    .from(menuProduct)
    .where(eq(menuProduct.menuId, menuId));

  const existingIds = existingProducts.map((p) => p.productId);

  // Get all active products
  const products = await db
    .select({
      id: product.id,
      name: product.name,
      baseCost: product.baseCost,
    })
    .from(product)
    .where(and(eq(product.workspaceId, workspace.id), eq(product.active, true)));

  // Filter out existing
  return products.filter((p) => !existingIds.includes(p.id));
}

// Get workspace fixed costs total
export async function getWorkspaceFixedCostsTotal(workspaceSlug: string) {
  await requireSession();
  const workspace = await getWorkspaceBySlug(workspaceSlug);

  if (!workspace) {
    return { total: 0, count: 0 };
  }

  const costs = await db
    .select({
      value: fixedCost.value,
    })
    .from(fixedCost)
    .where(and(eq(fixedCost.workspaceId, workspace.id), eq(fixedCost.active, true)));

  const total = costs.reduce((sum, c) => sum + parseFloat(c.value), 0);

  return { total, count: costs.length };
}

// Update menu apportionment settings
export async function updateMenuApportionment(
  workspaceSlug: string,
  menuId: string,
  formData: FormData
) {
  await requireSession();
  const workspace = await getWorkspaceBySlug(workspaceSlug);

  if (!workspace) {
    return { error: "Workspace não encontrado" };
  }

  const apportionmentType = formData.get("apportionmentType") as "percentage_of_sale" | "fixed_per_product" | "proportional_to_sales";
  const apportionmentValue = formData.get("apportionmentValue") as string;

  await db
    .update(menu)
    .set({
      apportionmentType: apportionmentType || "percentage_of_sale",
      apportionmentValue: apportionmentValue || null,
      updatedAt: new Date(),
    })
    .where(and(eq(menu.id, menuId), eq(menu.workspaceId, workspace.id)));

  // Recalculate all products when apportionment changes
  await recalculateMenuProductsCosts(workspaceSlug, menuId);

  revalidatePath(`/${workspaceSlug}/menus/${menuId}`);
  return { success: true };
}
