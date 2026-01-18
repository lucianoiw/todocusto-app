"use server";

import { revalidatePath } from "next/cache";
import { eq, and, ilike, count } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  product,
  productComposition,
  category,
  unit,
  ingredient,
  ingredientVariation,
  recipe,
  sizeGroup,
  sizeOption,
} from "@/lib/db/schema";
import { requireSession } from "@/lib/session";
import { getWorkspaceBySlug } from "./workspace";
import { generateId } from "@/lib/utils/id";

export interface ProductsFilters {
  search?: string;
  categoryId?: string;
  status?: "active" | "inactive";
  page?: number;
  perPage?: number;
}

export async function getProducts(workspaceSlug: string, filters?: ProductsFilters) {
  await requireSession();
  const workspace = await getWorkspaceBySlug(workspaceSlug);

  if (!workspace) {
    throw new Error("Workspace not found");
  }

  const page = filters?.page || 1;
  const perPage = filters?.perPage || 15;
  const offset = (page - 1) * perPage;

  // Build conditions
  const conditions = [eq(product.workspaceId, workspace.id)];

  if (filters?.search) {
    conditions.push(ilike(product.name, `%${filters.search}%`));
  }

  if (filters?.categoryId) {
    conditions.push(eq(product.categoryId, filters.categoryId));
  }

  if (filters?.status === "active") {
    conditions.push(eq(product.active, true));
  } else if (filters?.status === "inactive") {
    conditions.push(eq(product.active, false));
  }

  const whereClause = and(...conditions);

  // Get total count
  const totalResult = await db
    .select({ count: count() })
    .from(product)
    .where(whereClause);

  const total = totalResult[0]?.count || 0;

  const products = await db
    .select({
      id: product.id,
      name: product.name,
      description: product.description,
      categoryId: product.categoryId,
      categoryName: category.name,
      categoryColor: category.color,
      sizeGroupId: product.sizeGroupId,
      sizeGroupName: sizeGroup.name,
      baseCost: product.baseCost,
      availableForSale: product.availableForSale,
      active: product.active,
      createdAt: product.createdAt,
    })
    .from(product)
    .leftJoin(category, eq(product.categoryId, category.id))
    .leftJoin(sizeGroup, eq(product.sizeGroupId, sizeGroup.id))
    .where(whereClause)
    .orderBy(product.name)
    .limit(perPage)
    .offset(offset);

  return {
    products,
    pagination: {
      page,
      perPage,
      total,
      totalPages: Math.ceil(total / perPage),
    },
  };
}

export async function getProduct(workspaceSlug: string, productId: string) {
  await requireSession();
  const workspace = await getWorkspaceBySlug(workspaceSlug);

  if (!workspace) {
    throw new Error("Workspace not found");
  }

  const result = await db
    .select({
      id: product.id,
      name: product.name,
      description: product.description,
      categoryId: product.categoryId,
      categoryName: category.name,
      sizeGroupId: product.sizeGroupId,
      sizeGroupName: sizeGroup.name,
      tags: product.tags,
      baseCost: product.baseCost,
      availableForSale: product.availableForSale,
      active: product.active,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    })
    .from(product)
    .leftJoin(category, eq(product.categoryId, category.id))
    .leftJoin(sizeGroup, eq(product.sizeGroupId, sizeGroup.id))
    .where(and(eq(product.id, productId), eq(product.workspaceId, workspace.id)));

  if (!result[0]) {
    return null;
  }

  // If product has a size group, get the options with calculated costs
  let sizeOptions: { id: string; name: string; multiplier: string; isReference: boolean; calculatedCost: string }[] = [];
  if (result[0].sizeGroupId) {
    const options = await db
      .select({
        id: sizeOption.id,
        name: sizeOption.name,
        multiplier: sizeOption.multiplier,
        isReference: sizeOption.isReference,
        sortOrder: sizeOption.sortOrder,
      })
      .from(sizeOption)
      .where(eq(sizeOption.sizeGroupId, result[0].sizeGroupId))
      .orderBy(sizeOption.sortOrder);

    const baseCost = parseFloat(result[0].baseCost);
    sizeOptions = options.map((opt) => ({
      ...opt,
      calculatedCost: (baseCost * parseFloat(opt.multiplier)).toFixed(4),
    }));
  }

  return {
    ...result[0],
    sizeOptions,
  };
}

export async function createProduct(workspaceSlug: string, formData: FormData) {
  await requireSession();
  const workspace = await getWorkspaceBySlug(workspaceSlug);

  if (!workspace) {
    return { error: "Workspace não encontrado" };
  }

  const name = formData.get("name") as string;
  const description = formData.get("description") as string | null;
  const categoryId = formData.get("categoryId") as string | null;
  const sizeGroupId = formData.get("sizeGroupId") as string | null;
  const availableForSale = formData.get("availableForSale") === "true";
  const active = formData.get("active") === "true";

  if (!name) {
    return { error: "Nome é obrigatório" };
  }

  const id = generateId("prod");

  await db.insert(product).values({
    id,
    workspaceId: workspace.id,
    name: name.trim(),
    description: description?.trim() || null,
    categoryId: categoryId || null,
    sizeGroupId: sizeGroupId || null,
    availableForSale,
    active,
  });

  revalidatePath(`/${workspaceSlug}/products`);
  return { success: true, id };
}

export async function updateProduct(
  workspaceSlug: string,
  productId: string,
  formData: FormData
) {
  await requireSession();
  const workspace = await getWorkspaceBySlug(workspaceSlug);

  if (!workspace) {
    return { error: "Workspace não encontrado" };
  }

  const name = formData.get("name") as string;
  const description = formData.get("description") as string | null;
  const categoryId = formData.get("categoryId") as string | null;
  const sizeGroupId = formData.get("sizeGroupId") as string | null;
  const availableForSale = formData.get("availableForSale") === "true";
  const active = formData.get("active") === "true";

  if (!name) {
    return { error: "Nome é obrigatório" };
  }

  await db
    .update(product)
    .set({
      name: name.trim(),
      description: description?.trim() || null,
      categoryId: categoryId || null,
      sizeGroupId: sizeGroupId || null,
      availableForSale,
      active,
      updatedAt: new Date(),
    })
    .where(and(eq(product.id, productId), eq(product.workspaceId, workspace.id)));

  revalidatePath(`/${workspaceSlug}/products`);
  revalidatePath(`/${workspaceSlug}/products/${productId}`);
  return { success: true };
}

export async function deleteProduct(workspaceSlug: string, productId: string) {
  await requireSession();
  const workspace = await getWorkspaceBySlug(workspaceSlug);

  if (!workspace) {
    return { error: "Workspace não encontrado" };
  }

  // TODO: Check if product is in use (menus, combos) before deleting

  await db
    .delete(product)
    .where(and(eq(product.id, productId), eq(product.workspaceId, workspace.id)));

  revalidatePath(`/${workspaceSlug}/products`);
  return { success: true };
}

// Product Composition
export async function getProductComposition(productId: string) {
  await requireSession();

  const items = await db
    .select({
      id: productComposition.id,
      type: productComposition.type,
      itemId: productComposition.itemId,
      quantity: productComposition.quantity,
      unitId: productComposition.unitId,
      unitAbbreviation: unit.abbreviation,
      calculatedCost: productComposition.calculatedCost,
    })
    .from(productComposition)
    .leftJoin(unit, eq(productComposition.unitId, unit.id))
    .where(eq(productComposition.productId, productId));

  // Enrich with item names
  const enrichedItems = await Promise.all(
    items.map(async (item) => {
      let itemName = "";
      if (item.type === "ingredient") {
        const ing = await db
          .select({ name: ingredient.name })
          .from(ingredient)
          .where(eq(ingredient.id, item.itemId));
        itemName = ing[0]?.name || "Ingrediente não encontrado";
      } else if (item.type === "variation") {
        const v = await db
          .select({
            name: ingredientVariation.name,
            ingredientName: ingredient.name,
          })
          .from(ingredientVariation)
          .leftJoin(ingredient, eq(ingredientVariation.ingredientId, ingredient.id))
          .where(eq(ingredientVariation.id, item.itemId));
        itemName = v[0] ? `${v[0].ingredientName} - ${v[0].name}` : "Variação não encontrada";
      } else if (item.type === "recipe") {
        const rec = await db
          .select({ name: recipe.name })
          .from(recipe)
          .where(eq(recipe.id, item.itemId));
        itemName = rec[0]?.name || "Receita não encontrada";
      } else if (item.type === "product") {
        const prod = await db
          .select({ name: product.name })
          .from(product)
          .where(eq(product.id, item.itemId));
        itemName = prod[0]?.name || "Produto não encontrado";
      }
      return { ...item, itemName };
    })
  );

  return enrichedItems;
}

export async function addProductComposition(
  workspaceSlug: string,
  productId: string,
  formData: FormData
) {
  await requireSession();

  const type = formData.get("type") as "ingredient" | "variation" | "recipe" | "product";
  const itemId = formData.get("itemId") as string;
  const quantity = formData.get("quantity") as string;
  const unitId = formData.get("unitId") as string | null;

  if (!type || !itemId || !quantity) {
    return { error: "Todos os campos são obrigatórios" };
  }

  // Check for circular reference if adding a product
  if (type === "product" && itemId === productId) {
    return { error: "Um produto não pode conter a si mesmo" };
  }

  // Calculate cost
  const calculatedCost = await calculateCompositionCost(type, itemId, parseFloat(quantity), unitId);

  const id = generateId("pc");

  await db.insert(productComposition).values({
    id,
    productId,
    type,
    itemId,
    quantity,
    unitId: unitId || null,
    calculatedCost: calculatedCost.toFixed(4),
  });

  // Recalculate product base cost
  await recalculateProductCost(productId);

  revalidatePath(`/${workspaceSlug}/products/${productId}`);
  return { success: true, id };
}

export async function removeProductComposition(
  workspaceSlug: string,
  productId: string,
  compositionId: string
) {
  await requireSession();

  await db.delete(productComposition).where(eq(productComposition.id, compositionId));

  // Recalculate product base cost
  await recalculateProductCost(productId);

  revalidatePath(`/${workspaceSlug}/products/${productId}`);
  return { success: true };
}

export async function updateProductComposition(
  workspaceSlug: string,
  productId: string,
  compositionId: string,
  formData: FormData
) {
  await requireSession();

  const quantity = formData.get("quantity") as string;

  if (!quantity) {
    return { error: "Quantidade é obrigatória" };
  }

  // Get current composition to get type, itemId, unitId
  const current = await db
    .select({
      type: productComposition.type,
      itemId: productComposition.itemId,
      unitId: productComposition.unitId,
    })
    .from(productComposition)
    .where(eq(productComposition.id, compositionId));

  if (!current[0]) {
    return { error: "Item não encontrado" };
  }

  // Recalculate cost with new quantity
  const calculatedCost = await calculateCompositionCost(
    current[0].type as "ingredient" | "variation" | "recipe" | "product",
    current[0].itemId,
    parseFloat(quantity),
    current[0].unitId
  );

  await db
    .update(productComposition)
    .set({
      quantity,
      calculatedCost: calculatedCost.toFixed(4),
    })
    .where(eq(productComposition.id, compositionId));

  // Recalculate product base cost
  await recalculateProductCost(productId);

  revalidatePath(`/${workspaceSlug}/products/${productId}`);
  return { success: true };
}

// Helper functions
async function calculateCompositionCost(
  type: "ingredient" | "variation" | "recipe" | "product",
  itemId: string,
  quantity: number,
  unitId: string | null
): Promise<number> {
  // Get the input unit's conversion factor
  let inputConversionFactor = 1;
  if (unitId) {
    const inputUnit = await db.select({ conversionFactor: unit.conversionFactor }).from(unit).where(eq(unit.id, unitId));
    inputConversionFactor = inputUnit[0] ? parseFloat(inputUnit[0].conversionFactor) : 1;
  }

  // Convert quantity to base units (g, ml, or un)
  const quantityInBase = quantity * inputConversionFactor;

  if (type === "ingredient") {
    // baseCostPerUnit is cost per base unit (g, ml, or un)
    const ing = await db
      .select({ baseCostPerUnit: ingredient.baseCostPerUnit })
      .from(ingredient)
      .where(eq(ingredient.id, itemId));
    return ing[0] ? parseFloat(ing[0].baseCostPerUnit) * quantityInBase : 0;
  } else if (type === "variation") {
    // calculatedCost is cost per base unit
    const v = await db
      .select({ calculatedCost: ingredientVariation.calculatedCost })
      .from(ingredientVariation)
      .where(eq(ingredientVariation.id, itemId));
    return v[0] ? parseFloat(v[0].calculatedCost) * quantityInBase : 0;
  } else if (type === "recipe") {
    // costPerPortion is per yield unit - need to convert to base
    const rec = await db
      .select({ costPerPortion: recipe.costPerPortion, yieldUnitId: recipe.yieldUnitId })
      .from(recipe)
      .where(eq(recipe.id, itemId));

    if (!rec[0]) return 0;

    // Get recipe's yield unit conversion factor
    const yieldUnit = await db.select({ conversionFactor: unit.conversionFactor }).from(unit).where(eq(unit.id, rec[0].yieldUnitId));
    const yieldConversionFactor = yieldUnit[0] ? parseFloat(yieldUnit[0].conversionFactor) : 1;

    // Convert costPerPortion to cost per base unit
    const costPerBase = parseFloat(rec[0].costPerPortion) / yieldConversionFactor;
    return costPerBase * quantityInBase;
  } else if (type === "product") {
    // baseCost is total cost for 1 product unit
    const prod = await db
      .select({ baseCost: product.baseCost })
      .from(product)
      .where(eq(product.id, itemId));
    return prod[0] ? parseFloat(prod[0].baseCost) * quantity : 0;
  }
  return 0;
}

async function recalculateProductCost(productId: string, visitedProducts: Set<string> = new Set()) {
  // Prevent infinite loops in case of circular references
  if (visitedProducts.has(productId)) {
    return;
  }
  visitedProducts.add(productId);

  const items = await db
    .select({ calculatedCost: productComposition.calculatedCost })
    .from(productComposition)
    .where(eq(productComposition.productId, productId));

  const baseCost = items.reduce(
    (sum, item) => sum + parseFloat(item.calculatedCost),
    0
  );

  await db
    .update(product)
    .set({
      baseCost: baseCost.toFixed(4),
      updatedAt: new Date(),
    })
    .where(eq(product.id, productId));

  // CASCADE: Find all products that use this product in their composition
  const dependentCompositions = await db
    .select({
      productId: productComposition.productId,
      id: productComposition.id,
      quantity: productComposition.quantity,
      unitId: productComposition.unitId,
    })
    .from(productComposition)
    .where(
      and(
        eq(productComposition.type, "product"),
        eq(productComposition.itemId, productId)
      )
    );

  // Update each dependent product's composition cost and recalculate
  for (const comp of dependentCompositions) {
    // Recalculate composition cost with updated product cost
    const newCalculatedCost = await calculateCompositionCost(
      "product",
      productId,
      parseFloat(comp.quantity),
      comp.unitId
    );

    await db
      .update(productComposition)
      .set({ calculatedCost: newCalculatedCost.toFixed(4) })
      .where(eq(productComposition.id, comp.id));

    // Recursively recalculate the dependent product
    await recalculateProductCost(comp.productId, visitedProducts);
  }
}

// Get available items for product composition
export async function getAvailableItemsForProduct(workspaceSlug: string, currentProductId?: string) {
  await requireSession();
  const workspace = await getWorkspaceBySlug(workspaceSlug);

  if (!workspace) {
    return { ingredients: [], variations: [], recipes: [], products: [] };
  }

  // Get ingredients - use baseCostPerUnit for calculations
  const ingredients = await db
    .select({
      id: ingredient.id,
      name: ingredient.name,
      unitId: ingredient.priceUnitId,
      unitAbbreviation: unit.abbreviation,
      measurementType: unit.measurementType,
      baseCostPerUnit: ingredient.baseCostPerUnit,
    })
    .from(ingredient)
    .leftJoin(unit, eq(ingredient.priceUnitId, unit.id))
    .where(eq(ingredient.workspaceId, workspace.id));

  // Get variations
  const variations = await db
    .select({
      id: ingredientVariation.id,
      name: ingredientVariation.name,
      ingredientName: ingredient.name,
      unitId: ingredientVariation.unitId,
      unitAbbreviation: unit.abbreviation,
      measurementType: unit.measurementType,
      calculatedCost: ingredientVariation.calculatedCost,
    })
    .from(ingredientVariation)
    .innerJoin(ingredient, eq(ingredientVariation.ingredientId, ingredient.id))
    .leftJoin(unit, eq(ingredientVariation.unitId, unit.id))
    .where(eq(ingredient.workspaceId, workspace.id));

  // Get recipes
  const recipes = await db
    .select({
      id: recipe.id,
      name: recipe.name,
      unitId: recipe.yieldUnitId,
      unitAbbreviation: unit.abbreviation,
      measurementType: unit.measurementType,
      costPerPortion: recipe.costPerPortion,
    })
    .from(recipe)
    .leftJoin(unit, eq(recipe.yieldUnitId, unit.id))
    .where(eq(recipe.workspaceId, workspace.id));

  // Get products (excluding current one)
  const products = await db
    .select({
      id: product.id,
      name: product.name,
      baseCost: product.baseCost,
    })
    .from(product)
    .where(eq(product.workspaceId, workspace.id));

  return {
    ingredients: ingredients.map((i) => ({
      ...i,
      type: "ingredient" as const,
      displayName: i.name,
      cost: i.baseCostPerUnit,
    })),
    variations: variations.map((v) => ({
      ...v,
      type: "variation" as const,
      displayName: `${v.ingredientName} - ${v.name}`,
      cost: v.calculatedCost,
    })),
    recipes: recipes.map((r) => ({
      ...r,
      type: "recipe" as const,
      displayName: r.name,
      cost: r.costPerPortion,
    })),
    products: products
      .filter((p) => p.id !== currentProductId)
      .map((p) => ({
        ...p,
        type: "product" as const,
        displayName: p.name,
        cost: p.baseCost,
        unitId: null,
        unitAbbreviation: "un",
        measurementType: "unit" as const,
      })),
  };
}

// Recalculate all product composition costs (migration helper)
export async function recalculateAllProductCosts(workspaceSlug: string) {
  await requireSession();
  const workspace = await getWorkspaceBySlug(workspaceSlug);

  if (!workspace) {
    return { error: "Workspace não encontrado" };
  }

  // Get all products in workspace
  const products = await db
    .select({ id: product.id })
    .from(product)
    .where(eq(product.workspaceId, workspace.id));

  let compositionsUpdated = 0;

  for (const prod of products) {
    // Get all compositions for this product
    const compositions = await db
      .select({
        id: productComposition.id,
        type: productComposition.type,
        itemId: productComposition.itemId,
        quantity: productComposition.quantity,
        unitId: productComposition.unitId,
      })
      .from(productComposition)
      .where(eq(productComposition.productId, prod.id));

    for (const comp of compositions) {
      const newCost = await calculateCompositionCost(
        comp.type as "ingredient" | "variation" | "recipe" | "product",
        comp.itemId,
        parseFloat(comp.quantity),
        comp.unitId
      );

      await db
        .update(productComposition)
        .set({ calculatedCost: newCost.toFixed(4) })
        .where(eq(productComposition.id, comp.id));

      compositionsUpdated++;
    }

    // Recalculate product total cost
    await recalculateProductCost(prod.id);
  }

  revalidatePath(`/${workspaceSlug}`);
  return { success: true, productsProcessed: products.length, compositionsUpdated };
}
