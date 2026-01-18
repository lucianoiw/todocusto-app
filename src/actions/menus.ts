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
  sizeGroup,
  sizeOption,
  ingredient,
  recipe,
  unit,
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
      targetMargin: menu.targetMargin,
      pricingMode: menu.pricingMode,
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
  const targetMarginStr = formData.get("targetMargin") as string | null;
  const active = formData.get("active") === "true";

  if (!name) {
    return { error: "Nome é obrigatório" };
  }

  const id = generateId("menu");

  await db.insert(menu).values({
    id,
    workspaceId: workspace.id,
    name: name.trim(),
    description: description?.trim() || null,
    targetMargin: targetMarginStr || "30",
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
  const targetMarginStr = formData.get("targetMargin") as string | null;
  const pricingMode = formData.get("pricingMode") as "margin" | "markup" | null;
  const active = formData.get("active") === "true";

  if (!name) {
    return { error: "Nome é obrigatório" };
  }

  await db
    .update(menu)
    .set({
      name: name.trim(),
      description: description?.trim() || null,
      targetMargin: targetMarginStr || "30",
      pricingMode: pricingMode || "margin",
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

// Menu Products/Items
export async function getMenuProducts(menuId: string) {
  await requireSession();

  // Get all menu items
  const menuItems = await db
    .select({
      id: menuProduct.id,
      itemType: menuProduct.itemType,
      itemId: menuProduct.itemId,
      sizeOptionId: menuProduct.sizeOptionId,
      salePrice: menuProduct.salePrice,
      totalCost: menuProduct.totalCost,
      marginValue: menuProduct.marginValue,
      marginPercentage: menuProduct.marginPercentage,
    })
    .from(menuProduct)
    .where(eq(menuProduct.menuId, menuId));

  // Enrich items with their details
  const enrichedItems = await Promise.all(
    menuItems.map(async (item) => {
      let productName = "";
      let productBaseCost = "0";
      let productSizeGroupId: string | null = null;
      let sizeOptionName: string | null = null;
      let sizeOptionMultiplier: string | null = null;

      if (item.itemType === "product") {
        const prod = await db
          .select({
            name: product.name,
            baseCost: product.baseCost,
            sizeGroupId: product.sizeGroupId,
          })
          .from(product)
          .where(eq(product.id, item.itemId));

        if (prod[0]) {
          productName = prod[0].name;
          productBaseCost = prod[0].baseCost;
          productSizeGroupId = prod[0].sizeGroupId;
        }

        if (item.sizeOptionId) {
          const sizeOpt = await db
            .select({ name: sizeOption.name, multiplier: sizeOption.multiplier })
            .from(sizeOption)
            .where(eq(sizeOption.id, item.sizeOptionId));

          if (sizeOpt[0]) {
            sizeOptionName = sizeOpt[0].name;
            sizeOptionMultiplier = sizeOpt[0].multiplier;
          }
        }
      } else if (item.itemType === "ingredient") {
        const ing = await db
          .select({ name: ingredient.name, averagePrice: ingredient.averagePrice })
          .from(ingredient)
          .where(eq(ingredient.id, item.itemId));

        if (ing[0]) {
          productName = ing[0].name;
          productBaseCost = ing[0].averagePrice;
        }
      } else if (item.itemType === "recipe") {
        const rec = await db
          .select({ name: recipe.name, totalCost: recipe.totalCost })
          .from(recipe)
          .where(eq(recipe.id, item.itemId));

        if (rec[0]) {
          productName = rec[0].name;
          productBaseCost = rec[0].totalCost;
        }
      }

      return {
        id: item.id,
        itemType: item.itemType,
        productId: item.itemId, // Keep for backwards compatibility
        productName,
        productBaseCost,
        productSizeGroupId,
        sizeOptionId: item.sizeOptionId,
        sizeOptionName,
        sizeOptionMultiplier,
        salePrice: item.salePrice,
        totalCost: item.totalCost,
        marginValue: item.marginValue,
        marginPercentage: item.marginPercentage,
      };
    })
  );

  // Sort by product name and then size option name
  return enrichedItems.sort((a, b) => {
    const nameCompare = a.productName.localeCompare(b.productName);
    if (nameCompare !== 0) return nameCompare;
    if (a.sizeOptionName && b.sizeOptionName) {
      return a.sizeOptionName.localeCompare(b.sizeOptionName);
    }
    return 0;
  });
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

  const itemType = (formData.get("itemType") as string) || "product";
  const itemId = formData.get("itemId") as string || formData.get("productId") as string;
  const sizeOptionId = formData.get("sizeOptionId") as string | null;
  const salePrice = formData.get("salePrice") as string;

  if (!itemId || !salePrice) {
    return { error: "Item e preco de venda sao obrigatorios" };
  }

  // Check if item+size combination is already in menu
  const existing = await db
    .select({ id: menuProduct.id, sizeOptionId: menuProduct.sizeOptionId })
    .from(menuProduct)
    .where(and(
      eq(menuProduct.menuId, menuId),
      eq(menuProduct.itemId, itemId),
      eq(menuProduct.itemType, itemType as "product" | "ingredient" | "recipe")
    ));

  // Check if the specific item+size combination exists
  const isDuplicate = existing.some((e) =>
    sizeOptionId ? e.sizeOptionId === sizeOptionId : !e.sizeOptionId
  );

  if (isDuplicate) {
    return { error: "Este item (com este tamanho) ja esta no cardapio" };
  }

  // Get item base cost based on type
  let baseCost = 0;

  if (itemType === "product") {
    const prod = await db
      .select({ baseCost: product.baseCost, sizeGroupId: product.sizeGroupId })
      .from(product)
      .where(eq(product.id, itemId));

    if (!prod[0]) {
      return { error: "Produto nao encontrado" };
    }

    baseCost = parseFloat(prod[0].baseCost);

    // If product has sizes and sizeOptionId is provided, apply multiplier
    if (sizeOptionId) {
      const sizeOpt = await db
        .select({ multiplier: sizeOption.multiplier })
        .from(sizeOption)
        .where(eq(sizeOption.id, sizeOptionId));

      if (sizeOpt[0]) {
        baseCost = baseCost * parseFloat(sizeOpt[0].multiplier);
      }
    }
  } else if (itemType === "ingredient") {
    const ing = await db
      .select({ averagePrice: ingredient.averagePrice })
      .from(ingredient)
      .where(eq(ingredient.id, itemId));

    if (!ing[0]) {
      return { error: "Insumo nao encontrado" };
    }

    baseCost = parseFloat(ing[0].averagePrice);
  } else if (itemType === "recipe") {
    const rec = await db
      .select({ totalCost: recipe.totalCost })
      .from(recipe)
      .where(eq(recipe.id, itemId));

    if (!rec[0]) {
      return { error: "Receita nao encontrada" };
    }

    baseCost = parseFloat(rec[0].totalCost);
  }

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
    itemType: itemType as "product" | "ingredient" | "recipe",
    itemId,
    sizeOptionId: sizeOptionId || null,
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

  // Get current menu item to get itemType, itemId and sizeOptionId
  const current = await db
    .select({
      itemType: menuProduct.itemType,
      itemId: menuProduct.itemId,
      sizeOptionId: menuProduct.sizeOptionId,
    })
    .from(menuProduct)
    .where(eq(menuProduct.id, menuProductId));

  if (!current[0]) {
    return { error: "Item não encontrado" };
  }

  // Get item base cost based on type
  let baseCost = 0;

  if (current[0].itemType === "product") {
    const prod = await db
      .select({ baseCost: product.baseCost })
      .from(product)
      .where(eq(product.id, current[0].itemId));

    if (!prod[0]) {
      return { error: "Produto não encontrado" };
    }

    baseCost = parseFloat(prod[0].baseCost);

    // If item has sizeOptionId, apply multiplier
    if (current[0].sizeOptionId) {
      const sizeOpt = await db
        .select({ multiplier: sizeOption.multiplier })
        .from(sizeOption)
        .where(eq(sizeOption.id, current[0].sizeOptionId));

      if (sizeOpt[0]) {
        baseCost = baseCost * parseFloat(sizeOpt[0].multiplier);
      }
    }
  } else if (current[0].itemType === "ingredient") {
    const ing = await db
      .select({ averagePrice: ingredient.averagePrice })
      .from(ingredient)
      .where(eq(ingredient.id, current[0].itemId));

    if (!ing[0]) {
      return { error: "Insumo não encontrado" };
    }

    baseCost = parseFloat(ing[0].averagePrice);
  } else if (current[0].itemType === "recipe") {
    const rec = await db
      .select({ totalCost: recipe.totalCost })
      .from(recipe)
      .where(eq(recipe.id, current[0].itemId));

    if (!rec[0]) {
      return { error: "Receita não encontrada" };
    }

    baseCost = parseFloat(rec[0].totalCost);
  }

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

// Helper: Recalculate all items costs when fees or fixed costs change
async function recalculateMenuProductsCosts(workspaceSlug: string, menuId: string) {
  const workspace = await getWorkspaceBySlug(workspaceSlug);
  if (!workspace) return;

  const items = await db
    .select({
      id: menuProduct.id,
      itemType: menuProduct.itemType,
      itemId: menuProduct.itemId,
      sizeOptionId: menuProduct.sizeOptionId,
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

  for (const mp of items) {
    let baseCost = 0;

    // Get base cost based on item type
    if (mp.itemType === "product") {
      const prod = await db
        .select({ baseCost: product.baseCost })
        .from(product)
        .where(eq(product.id, mp.itemId));

      if (!prod[0]) continue;

      baseCost = parseFloat(prod[0].baseCost);

      // Apply size multiplier if applicable
      if (mp.sizeOptionId) {
        const sizeOpt = await db
          .select({ multiplier: sizeOption.multiplier })
          .from(sizeOption)
          .where(eq(sizeOption.id, mp.sizeOptionId));

        if (sizeOpt[0]) {
          baseCost = baseCost * parseFloat(sizeOpt[0].multiplier);
        }
      }
    } else if (mp.itemType === "ingredient") {
      const ing = await db
        .select({ averagePrice: ingredient.averagePrice })
        .from(ingredient)
        .where(eq(ingredient.id, mp.itemId));

      if (!ing[0]) continue;

      baseCost = parseFloat(ing[0].averagePrice);
    } else if (mp.itemType === "recipe") {
      const rec = await db
        .select({ totalCost: recipe.totalCost })
        .from(recipe)
        .where(eq(recipe.id, mp.itemId));

      if (!rec[0]) continue;

      baseCost = parseFloat(rec[0].totalCost);
    }

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

// Get available items for menu (products, ingredients, recipes)
export async function getAvailableItemsForMenu(workspaceSlug: string, menuId: string) {
  await requireSession();
  const workspace = await getWorkspaceBySlug(workspaceSlug);

  if (!workspace) {
    return { products: [], ingredients: [], recipes: [] };
  }

  // Get items already in menu
  const existingItems = await db
    .select({
      itemType: menuProduct.itemType,
      itemId: menuProduct.itemId,
      sizeOptionId: menuProduct.sizeOptionId,
    })
    .from(menuProduct)
    .where(eq(menuProduct.menuId, menuId));

  // Get all active products with size group info (only those available for sale)
  const products = await db
    .select({
      id: product.id,
      name: product.name,
      baseCost: product.baseCost,
      sizeGroupId: product.sizeGroupId,
      sizeGroupName: sizeGroup.name,
    })
    .from(product)
    .leftJoin(sizeGroup, eq(product.sizeGroupId, sizeGroup.id))
    .where(and(
      eq(product.workspaceId, workspace.id),
      eq(product.active, true),
      eq(product.availableForSale, true)
    ));

  // For each product, get size options if it has a size group
  const productsWithSizes = await Promise.all(
    products.map(async (prod) => {
      if (!prod.sizeGroupId) {
        // Simple product - check if already in menu
        const isInMenu = existingItems.some(
          (e) => e.itemType === "product" && e.itemId === prod.id && !e.sizeOptionId
        );
        return {
          ...prod,
          sizeOptions: [],
          isInMenu,
        };
      }

      // Product with sizes - get options
      const options = await db
        .select({
          id: sizeOption.id,
          name: sizeOption.name,
          multiplier: sizeOption.multiplier,
          isReference: sizeOption.isReference,
          sortOrder: sizeOption.sortOrder,
        })
        .from(sizeOption)
        .where(eq(sizeOption.sizeGroupId, prod.sizeGroupId))
        .orderBy(sizeOption.sortOrder);

      const baseCost = parseFloat(prod.baseCost);
      const sizeOptionsWithCost = options.map((opt) => ({
        ...opt,
        calculatedCost: (baseCost * parseFloat(opt.multiplier)).toFixed(4),
        isInMenu: existingItems.some(
          (e) => e.itemType === "product" && e.itemId === prod.id && e.sizeOptionId === opt.id
        ),
      }));

      // Check if all sizes are in menu
      const allInMenu = sizeOptionsWithCost.every((opt) => opt.isInMenu);

      return {
        ...prod,
        sizeOptions: sizeOptionsWithCost,
        isInMenu: allInMenu,
      };
    })
  );

  // Get ingredients available for sale
  const ingredientsData = await db
    .select({
      id: ingredient.id,
      name: ingredient.name,
      averagePrice: ingredient.averagePrice,
      unitAbbreviation: unit.abbreviation,
    })
    .from(ingredient)
    .leftJoin(unit, eq(ingredient.priceUnitId, unit.id))
    .where(and(
      eq(ingredient.workspaceId, workspace.id),
      eq(ingredient.availableForSale, true)
    ))
    .orderBy(ingredient.name);

  const ingredientsWithStatus = ingredientsData.map((ing) => ({
    ...ing,
    baseCost: ing.averagePrice,
    isInMenu: existingItems.some(
      (e) => e.itemType === "ingredient" && e.itemId === ing.id
    ),
  }));

  // Get recipes available for sale
  const recipesData = await db
    .select({
      id: recipe.id,
      name: recipe.name,
      totalCost: recipe.totalCost,
      yieldQuantity: recipe.yieldQuantity,
      unitAbbreviation: unit.abbreviation,
    })
    .from(recipe)
    .leftJoin(unit, eq(recipe.yieldUnitId, unit.id))
    .where(and(
      eq(recipe.workspaceId, workspace.id),
      eq(recipe.availableForSale, true)
    ))
    .orderBy(recipe.name);

  const recipesWithStatus = recipesData.map((rec) => ({
    ...rec,
    baseCost: rec.totalCost,
    isInMenu: existingItems.some(
      (e) => e.itemType === "recipe" && e.itemId === rec.id
    ),
  }));

  return {
    products: productsWithSizes,
    ingredients: ingredientsWithStatus,
    recipes: recipesWithStatus,
  };
}

// Legacy alias for backwards compatibility
export async function getAvailableProductsForMenu(workspaceSlug: string, menuId: string) {
  const result = await getAvailableItemsForMenu(workspaceSlug, menuId);
  return result.products;
}

// Add all size options of a product to the menu
export async function addAllProductSizesToMenu(
  workspaceSlug: string,
  menuId: string,
  productId: string,
  prices: { sizeOptionId: string; salePrice: string }[]
) {
  await requireSession();

  const results = [];
  for (const price of prices) {
    const formData = new FormData();
    formData.set("productId", productId);
    formData.set("sizeOptionId", price.sizeOptionId);
    formData.set("salePrice", price.salePrice);

    const result = await addMenuProduct(workspaceSlug, menuId, formData);
    results.push(result);
  }

  return { success: true, results };
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

// Update menu target margin
export async function updateMenuTargetMargin(
  workspaceSlug: string,
  menuId: string,
  targetMargin: string,
  updateExistingProducts: boolean = false,
  oldTargetMargin?: number
) {
  await requireSession();
  const workspace = await getWorkspaceBySlug(workspaceSlug);

  if (!workspace) {
    return { error: "Workspace não encontrado" };
  }

  await db
    .update(menu)
    .set({
      targetMargin,
      updatedAt: new Date(),
    })
    .where(and(eq(menu.id, menuId), eq(menu.workspaceId, workspace.id)));

  // Recalculate product prices if requested (only products at old margin)
  if (updateExistingProducts && oldTargetMargin !== undefined) {
    await recalculateMenuProductPrices(workspaceSlug, menuId, parseFloat(targetMargin), oldTargetMargin);
  }

  revalidatePath(`/${workspaceSlug}/menus/${menuId}`);
  return { success: true };
}

// Recalculate menu product prices based on target margin
// Only updates products whose current margin matches the old target margin (±0.5%)
async function recalculateMenuProductPrices(
  workspaceSlug: string,
  menuId: string,
  newTargetMarginPct: number,
  oldTargetMarginPct: number
) {
  const workspace = await getWorkspaceBySlug(workspaceSlug);
  if (!workspace) return;

  // Get menu settings
  const menuData = await db
    .select({
      apportionmentType: menu.apportionmentType,
      apportionmentValue: menu.apportionmentValue,
    })
    .from(menu)
    .where(eq(menu.id, menuId));

  if (!menuData[0]) return;

  const apportionmentType = menuData[0].apportionmentType;
  const apportionmentValue = parseFloat(menuData[0].apportionmentValue || "0");

  // Get fees
  const fees = await db
    .select({
      type: menuFee.type,
      value: menuFee.value,
      active: menuFee.active,
    })
    .from(menuFee)
    .where(eq(menuFee.menuId, menuId));

  // Calculate fee totals
  let fixedFees = 0;
  let percentageFees = 0;
  for (const fee of fees) {
    if (!fee.active) continue;
    if (fee.type === "fixed") {
      fixedFees += parseFloat(fee.value);
    } else {
      percentageFees += parseFloat(fee.value);
    }
  }

  // Get total monthly fixed costs
  const workspaceFixedCosts = await db
    .select({ value: fixedCost.value })
    .from(fixedCost)
    .where(and(eq(fixedCost.workspaceId, workspace.id), eq(fixedCost.active, true)));

  const totalMonthlyFixedCost = workspaceFixedCosts.reduce(
    (sum, fc) => sum + parseFloat(fc.value),
    0
  );

  // Get all menu items with their current margin
  const items = await db
    .select({
      id: menuProduct.id,
      itemType: menuProduct.itemType,
      itemId: menuProduct.itemId,
      sizeOptionId: menuProduct.sizeOptionId,
      marginPercentage: menuProduct.marginPercentage,
    })
    .from(menuProduct)
    .where(eq(menuProduct.menuId, menuId));

  // Tolerance for margin comparison (±0.5%)
  const MARGIN_TOLERANCE = 0.5;

  // Recalculate only items at the old target margin
  for (const mp of items) {
    // Check if item margin is close to old target margin
    const currentMargin = parseFloat(mp.marginPercentage);
    if (Math.abs(currentMargin - oldTargetMarginPct) > MARGIN_TOLERANCE) {
      // Item was manually adjusted, skip it
      continue;
    }

    // Get item base cost based on type
    let baseCost = 0;

    if (mp.itemType === "product") {
      const prod = await db
        .select({ baseCost: product.baseCost })
        .from(product)
        .where(eq(product.id, mp.itemId));

      if (!prod[0]) continue;

      baseCost = parseFloat(prod[0].baseCost);

      // Apply size multiplier if applicable
      if (mp.sizeOptionId) {
        const sizeOpt = await db
          .select({ multiplier: sizeOption.multiplier })
          .from(sizeOption)
          .where(eq(sizeOption.id, mp.sizeOptionId));

        if (sizeOpt[0]) {
          baseCost = baseCost * parseFloat(sizeOpt[0].multiplier);
        }
      }
    } else if (mp.itemType === "ingredient") {
      const ing = await db
        .select({ averagePrice: ingredient.averagePrice })
        .from(ingredient)
        .where(eq(ingredient.id, mp.itemId));

      if (!ing[0]) continue;

      baseCost = parseFloat(ing[0].averagePrice);
    } else if (mp.itemType === "recipe") {
      const rec = await db
        .select({ totalCost: recipe.totalCost })
        .from(recipe)
        .where(eq(recipe.id, mp.itemId));

      if (!rec[0]) continue;

      baseCost = parseFloat(rec[0].totalCost);
    }

    // Calculate additional fixed cost based on apportionment type
    let additionalFixedCost = 0;
    let percentageFixedCost = 0;

    if (totalMonthlyFixedCost > 0 && apportionmentValue > 0) {
      if (apportionmentType === "percentage_of_sale") {
        percentageFixedCost = apportionmentValue;
      } else if (apportionmentType === "fixed_per_product") {
        additionalFixedCost = apportionmentValue;
      } else if (apportionmentType === "proportional_to_sales") {
        additionalFixedCost = totalMonthlyFixedCost / apportionmentValue;
      }
    }

    // Calculate suggested price
    // Formula: sale_price = (base_cost + fixed_fees + additional_fixed_cost) / (1 - margin_pct - percentage_fees - percentage_fixed_cost)
    const denominator = 1 - (newTargetMarginPct / 100) - (percentageFees / 100) - (percentageFixedCost / 100);

    if (denominator <= 0) {
      // Skip products where margin is too high
      continue;
    }

    const newSalePrice = (baseCost + fixedFees + additionalFixedCost) / denominator;

    // Calculate costs for this price
    let feesCost = fixedFees + (newSalePrice * (percentageFees / 100));
    let fixedCostApportionment = 0;

    if (totalMonthlyFixedCost > 0 && apportionmentValue > 0) {
      switch (apportionmentType) {
        case "percentage_of_sale":
          fixedCostApportionment = newSalePrice * (apportionmentValue / 100);
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
    const marginValue = newSalePrice - totalCost;
    const marginPercentage = newSalePrice > 0 ? (marginValue / newSalePrice) * 100 : 0;

    // Update the product
    await db
      .update(menuProduct)
      .set({
        salePrice: newSalePrice.toFixed(4),
        totalCost: totalCost.toFixed(4),
        marginValue: marginValue.toFixed(4),
        marginPercentage: marginPercentage.toFixed(4),
        updatedAt: new Date(),
      })
      .where(eq(menuProduct.id, mp.id));
  }
}
