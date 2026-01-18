"use server";

import { revalidatePath } from "next/cache";
import { eq, and, ilike, sql, count } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  recipe,
  recipeItem,
  recipeStep,
  category,
  unit,
  ingredient,
  ingredientVariation,
  workspace,
  productComposition,
  product,
} from "@/lib/db/schema";
import { requireSession } from "@/lib/session";
import { getWorkspaceBySlug } from "./workspace";
import { generateId } from "@/lib/utils/id";

export interface RecipesFilters {
  search?: string;
  categoryId?: string;
  page?: number;
  perPage?: number;
}

export async function getRecipes(workspaceSlug: string, filters?: RecipesFilters) {
  await requireSession();
  const workspace = await getWorkspaceBySlug(workspaceSlug);

  if (!workspace) {
    throw new Error("Workspace not found");
  }

  const page = filters?.page || 1;
  const perPage = filters?.perPage || 15;
  const offset = (page - 1) * perPage;

  // Build conditions
  const conditions = [eq(recipe.workspaceId, workspace.id)];

  if (filters?.search) {
    conditions.push(ilike(recipe.name, `%${filters.search}%`));
  }

  if (filters?.categoryId) {
    conditions.push(eq(recipe.categoryId, filters.categoryId));
  }

  const whereClause = and(...conditions);

  // Get total count
  const totalResult = await db
    .select({ count: count() })
    .from(recipe)
    .where(whereClause);

  const total = totalResult[0]?.count || 0;

  const recipes = await db
    .select({
      id: recipe.id,
      name: recipe.name,
      description: recipe.description,
      categoryId: recipe.categoryId,
      categoryName: category.name,
      categoryColor: category.color,
      yieldQuantity: recipe.yieldQuantity,
      yieldUnitId: recipe.yieldUnitId,
      yieldUnitAbbreviation: unit.abbreviation,
      prepTime: recipe.prepTime,
      totalCost: recipe.totalCost,
      costPerPortion: recipe.costPerPortion,
      createdAt: recipe.createdAt,
    })
    .from(recipe)
    .leftJoin(category, eq(recipe.categoryId, category.id))
    .leftJoin(unit, eq(recipe.yieldUnitId, unit.id))
    .where(whereClause)
    .orderBy(recipe.name)
    .limit(perPage)
    .offset(offset);

  return {
    recipes,
    pagination: {
      page,
      perPage,
      total,
      totalPages: Math.ceil(total / perPage),
    },
  };
}

export async function getRecipe(workspaceSlug: string, recipeId: string) {
  await requireSession();
  const workspace = await getWorkspaceBySlug(workspaceSlug);

  if (!workspace) {
    throw new Error("Workspace not found");
  }

  const result = await db
    .select({
      id: recipe.id,
      name: recipe.name,
      description: recipe.description,
      categoryId: recipe.categoryId,
      categoryName: category.name,
      yieldQuantity: recipe.yieldQuantity,
      yieldUnitId: recipe.yieldUnitId,
      yieldUnitName: unit.name,
      yieldUnitAbbreviation: unit.abbreviation,
      yieldUnitConversionFactor: unit.conversionFactor,
      yieldUnitMeasurementType: unit.measurementType,
      prepTime: recipe.prepTime,
      tags: recipe.tags,
      allergens: recipe.allergens,
      availableForSale: recipe.availableForSale,
      totalCost: recipe.totalCost,
      totalTime: recipe.totalTime,
      laborCost: recipe.laborCost,
      costPerPortion: recipe.costPerPortion,
      createdAt: recipe.createdAt,
      updatedAt: recipe.updatedAt,
    })
    .from(recipe)
    .leftJoin(category, eq(recipe.categoryId, category.id))
    .leftJoin(unit, eq(recipe.yieldUnitId, unit.id))
    .where(and(eq(recipe.id, recipeId), eq(recipe.workspaceId, workspace.id)));

  if (!result[0]) return null;

  const hasLaborCostConfigured = workspace.laborCostPerHour !== null && parseFloat(workspace.laborCostPerHour) > 0;

  return {
    ...result[0],
    hasLaborCostConfigured,
  };
}

export async function createRecipe(workspaceSlug: string, formData: FormData) {
  await requireSession();
  const workspace = await getWorkspaceBySlug(workspaceSlug);

  if (!workspace) {
    return { error: "Workspace não encontrado" };
  }

  const name = formData.get("name") as string;
  const description = formData.get("description") as string | null;
  const categoryId = formData.get("categoryId") as string | null;
  const yieldQuantity = formData.get("yieldQuantity") as string;
  const yieldUnitId = formData.get("yieldUnitId") as string;
  const prepTime = formData.get("prepTime") as string | null;

  if (!name || !yieldQuantity || !yieldUnitId) {
    return { error: "Nome, rendimento e unidade são obrigatórios" };
  }

  const id = generateId("rec");

  await db.insert(recipe).values({
    id,
    workspaceId: workspace.id,
    name: name.trim(),
    description: description?.trim() || null,
    categoryId: categoryId || null,
    yieldQuantity,
    yieldUnitId,
    prepTime: prepTime ? parseInt(prepTime) : null,
  });

  revalidatePath(`/${workspaceSlug}/recipes`);
  return { success: true, id };
}

export async function updateRecipe(
  workspaceSlug: string,
  recipeId: string,
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
  const yieldQuantity = formData.get("yieldQuantity") as string;
  const yieldUnitId = formData.get("yieldUnitId") as string;
  const prepTime = formData.get("prepTime") as string | null;
  const availableForSale = formData.get("availableForSale") === "true";

  if (!name || !yieldQuantity || !yieldUnitId) {
    return { error: "Nome, rendimento e unidade são obrigatórios" };
  }

  await db
    .update(recipe)
    .set({
      name: name.trim(),
      description: description?.trim() || null,
      categoryId: categoryId || null,
      yieldQuantity,
      yieldUnitId,
      prepTime: prepTime ? parseInt(prepTime) : null,
      availableForSale,
      updatedAt: new Date(),
    })
    .where(and(eq(recipe.id, recipeId), eq(recipe.workspaceId, workspace.id)));

  // Recalculate costs
  await recalculateRecipeCost(recipeId);

  revalidatePath(`/${workspaceSlug}/recipes`);
  revalidatePath(`/${workspaceSlug}/recipes/${recipeId}`);
  return { success: true };
}

export async function deleteRecipe(workspaceSlug: string, recipeId: string) {
  await requireSession();
  const workspace = await getWorkspaceBySlug(workspaceSlug);

  if (!workspace) {
    return { error: "Workspace não encontrado" };
  }

  // TODO: Check if recipe is in use (products, other recipes) before deleting

  await db
    .delete(recipe)
    .where(and(eq(recipe.id, recipeId), eq(recipe.workspaceId, workspace.id)));

  revalidatePath(`/${workspaceSlug}/recipes`);
  return { success: true };
}

// Recipe Items
export async function getRecipeItems(recipeId: string) {
  await requireSession();

  const items = await db
    .select({
      id: recipeItem.id,
      type: recipeItem.type,
      itemId: recipeItem.itemId,
      quantity: recipeItem.quantity,
      unitId: recipeItem.unitId,
      unitAbbreviation: unit.abbreviation,
      calculatedCost: recipeItem.calculatedCost,
      order: recipeItem.order,
    })
    .from(recipeItem)
    .leftJoin(unit, eq(recipeItem.unitId, unit.id))
    .where(eq(recipeItem.recipeId, recipeId))
    .orderBy(recipeItem.order);

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
      }
      return { ...item, itemName };
    })
  );

  return enrichedItems;
}

export async function addRecipeItem(
  workspaceSlug: string,
  recipeId: string,
  formData: FormData
) {
  await requireSession();

  const type = formData.get("type") as "ingredient" | "variation" | "recipe";
  const itemId = formData.get("itemId") as string;
  const quantity = formData.get("quantity") as string;
  const unitId = formData.get("unitId") as string;

  if (!type || !itemId || !quantity || !unitId) {
    return { error: "Todos os campos são obrigatórios" };
  }

  // Check for circular reference if adding a recipe
  if (type === "recipe" && itemId === recipeId) {
    return { error: "Uma receita não pode usar a si mesma como ingrediente" };
  }

  // Validate unit compatibility
  const selectedUnit = await db.select().from(unit).where(eq(unit.id, unitId));
  if (!selectedUnit[0]) {
    return { error: "Unidade não encontrada" };
  }

  if (type === "ingredient") {
    const ing = await db.select({ measurementType: ingredient.measurementType }).from(ingredient).where(eq(ingredient.id, itemId));
    if (ing[0] && ing[0].measurementType !== selectedUnit[0].measurementType) {
      return { error: "Unidade incompatível com o tipo de medida do ingrediente" };
    }
  } else if (type === "variation") {
    const v = await db
      .select({ measurementType: ingredient.measurementType })
      .from(ingredientVariation)
      .innerJoin(ingredient, eq(ingredientVariation.ingredientId, ingredient.id))
      .where(eq(ingredientVariation.id, itemId));
    if (v[0] && v[0].measurementType !== selectedUnit[0].measurementType) {
      return { error: "Unidade incompatível com o tipo de medida da variação" };
    }
  }

  // Get max order
  const maxOrder = await db
    .select({ order: recipeItem.order })
    .from(recipeItem)
    .where(eq(recipeItem.recipeId, recipeId))
    .orderBy(recipeItem.order);

  const order = maxOrder.length > 0 ? maxOrder[maxOrder.length - 1].order + 1 : 0;

  // Calculate cost
  const calculatedCost = await calculateItemCost(type, itemId, parseFloat(quantity), unitId);

  const id = generateId("ri");

  await db.insert(recipeItem).values({
    id,
    recipeId,
    type,
    itemId,
    quantity,
    unitId,
    calculatedCost: calculatedCost.toFixed(4),
    order,
  });

  // Recalculate recipe total cost
  await recalculateRecipeCost(recipeId);

  revalidatePath(`/${workspaceSlug}/recipes/${recipeId}`);
  return { success: true, id };
}

export async function removeRecipeItem(
  workspaceSlug: string,
  recipeId: string,
  itemId: string
) {
  await requireSession();

  await db.delete(recipeItem).where(eq(recipeItem.id, itemId));

  // Recalculate recipe total cost
  await recalculateRecipeCost(recipeId);

  revalidatePath(`/${workspaceSlug}/recipes/${recipeId}`);
  return { success: true };
}

export async function updateRecipeItem(
  workspaceSlug: string,
  recipeId: string,
  itemId: string,
  formData: FormData
) {
  await requireSession();

  const quantity = formData.get("quantity") as string;
  const unitId = formData.get("unitId") as string;

  if (!quantity || !unitId) {
    return { error: "Quantidade e unidade são obrigatórios" };
  }

  // Get current item to know the type
  const currentItem = await db
    .select()
    .from(recipeItem)
    .where(eq(recipeItem.id, itemId));

  if (!currentItem[0]) {
    return { error: "Item não encontrado" };
  }

  const item = currentItem[0];

  // Validate unit compatibility
  const selectedUnit = await db.select().from(unit).where(eq(unit.id, unitId));
  if (!selectedUnit[0]) {
    return { error: "Unidade não encontrada" };
  }

  if (item.type === "ingredient") {
    const ing = await db.select({ measurementType: ingredient.measurementType }).from(ingredient).where(eq(ingredient.id, item.itemId));
    if (ing[0] && ing[0].measurementType !== selectedUnit[0].measurementType) {
      return { error: "Unidade incompatível com o tipo de medida do ingrediente" };
    }
  } else if (item.type === "variation") {
    const v = await db
      .select({ measurementType: ingredient.measurementType })
      .from(ingredientVariation)
      .innerJoin(ingredient, eq(ingredientVariation.ingredientId, ingredient.id))
      .where(eq(ingredientVariation.id, item.itemId));
    if (v[0] && v[0].measurementType !== selectedUnit[0].measurementType) {
      return { error: "Unidade incompatível com o tipo de medida da variação" };
    }
  }

  // Calculate new cost
  const calculatedCost = await calculateItemCost(item.type, item.itemId, parseFloat(quantity), unitId);

  await db
    .update(recipeItem)
    .set({
      quantity,
      unitId,
      calculatedCost: calculatedCost.toFixed(4),
    })
    .where(eq(recipeItem.id, itemId));

  // Recalculate recipe total cost
  await recalculateRecipeCost(recipeId);

  revalidatePath(`/${workspaceSlug}/recipes/${recipeId}`);
  return { success: true };
}

// Recipe Steps
export async function getRecipeSteps(recipeId: string) {
  await requireSession();

  const steps = await db
    .select()
    .from(recipeStep)
    .where(eq(recipeStep.recipeId, recipeId))
    .orderBy(recipeStep.order);

  return steps;
}

export async function addRecipeStep(
  workspaceSlug: string,
  recipeId: string,
  formData: FormData
) {
  await requireSession();

  const description = formData.get("description") as string;
  const time = formData.get("time") as string | null;

  if (!description) {
    return { error: "Descrição é obrigatória" };
  }

  // Get max order
  const maxOrder = await db
    .select({ order: recipeStep.order })
    .from(recipeStep)
    .where(eq(recipeStep.recipeId, recipeId))
    .orderBy(recipeStep.order);

  const order = maxOrder.length > 0 ? maxOrder[maxOrder.length - 1].order + 1 : 1;

  const id = generateId("rs");

  await db.insert(recipeStep).values({
    id,
    recipeId,
    order,
    description: description.trim(),
    time: time ? parseInt(time) : null,
  });

  // Recalculate recipe (totalTime affects labor cost)
  await recalculateRecipeCost(recipeId);

  revalidatePath(`/${workspaceSlug}/recipes/${recipeId}`);
  return { success: true, id };
}

export async function removeRecipeStep(
  workspaceSlug: string,
  recipeId: string,
  stepId: string
) {
  await requireSession();

  await db.delete(recipeStep).where(eq(recipeStep.id, stepId));

  // Recalculate recipe (totalTime affects labor cost)
  await recalculateRecipeCost(recipeId);

  revalidatePath(`/${workspaceSlug}/recipes/${recipeId}`);
  return { success: true };
}

export async function updateRecipeStep(
  workspaceSlug: string,
  recipeId: string,
  stepId: string,
  formData: FormData
) {
  await requireSession();

  const description = formData.get("description") as string;
  const time = formData.get("time") as string | null;

  if (!description) {
    return { error: "Descrição é obrigatória" };
  }

  await db
    .update(recipeStep)
    .set({
      description: description.trim(),
      time: time ? parseInt(time) : null,
    })
    .where(eq(recipeStep.id, stepId));

  // Recalculate recipe (totalTime affects labor cost)
  await recalculateRecipeCost(recipeId);

  revalidatePath(`/${workspaceSlug}/recipes/${recipeId}`);
  return { success: true };
}

// Helper functions
async function calculateItemCost(
  type: "ingredient" | "variation" | "recipe",
  itemId: string,
  quantity: number,
  unitId: string
): Promise<number> {
  // Get the unit's conversion factor
  const unitResult = await db
    .select({ conversionFactor: unit.conversionFactor })
    .from(unit)
    .where(eq(unit.id, unitId));

  const conversionFactor = unitResult[0] ? parseFloat(unitResult[0].conversionFactor) : 1;

  // Convert quantity to base unit (g, ml, or un)
  const quantityInBase = quantity * conversionFactor;

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
    // costPerPortion is cost per yield unit - need to convert
    const rec = await db
      .select({
        costPerPortion: recipe.costPerPortion,
        yieldUnitId: recipe.yieldUnitId
      })
      .from(recipe)
      .where(eq(recipe.id, itemId));

    if (!rec[0]) return 0;

    // Get recipe's yield unit conversion factor
    const yieldUnitResult = await db
      .select({ conversionFactor: unit.conversionFactor })
      .from(unit)
      .where(eq(unit.id, rec[0].yieldUnitId));

    const yieldConversionFactor = yieldUnitResult[0] ? parseFloat(yieldUnitResult[0].conversionFactor) : 1;

    // costPerPortion is per yield unit, convert to base then multiply by quantity in base
    const costPerBase = parseFloat(rec[0].costPerPortion) / yieldConversionFactor;
    return costPerBase * quantityInBase;
  }
  return 0;
}

async function recalculateRecipeCost(recipeId: string, visitedRecipes: Set<string> = new Set()) {
  // Prevent infinite loops in case of circular references
  if (visitedRecipes.has(recipeId)) {
    return;
  }
  visitedRecipes.add(recipeId);

  // Get all items
  const items = await db
    .select({ calculatedCost: recipeItem.calculatedCost })
    .from(recipeItem)
    .where(eq(recipeItem.recipeId, recipeId));

  const totalCost = items.reduce(
    (sum, item) => sum + parseFloat(item.calculatedCost),
    0
  );

  // Get recipe with workspace for labor cost calculation
  const rec = await db
    .select({
      yieldQuantity: recipe.yieldQuantity,
      yieldUnitId: recipe.yieldUnitId,
      workspaceId: recipe.workspaceId,
      prepTime: recipe.prepTime,
    })
    .from(recipe)
    .where(eq(recipe.id, recipeId));

  if (!rec[0]) return;

  // Use prepTime from recipe for labor cost calculation
  const prepTime = rec[0].prepTime || 0;

  // Get workspace labor cost per hour
  const ws = await db
    .select({ laborCostPerHour: workspace.laborCostPerHour })
    .from(workspace)
    .where(eq(workspace.id, rec[0].workspaceId));

  const laborCostPerHour = ws[0]?.laborCostPerHour ? parseFloat(ws[0].laborCostPerHour) : 0;

  // Calculate labor cost: (prepTime in minutes / 60) * laborCostPerHour
  const laborCost = (prepTime / 60) * laborCostPerHour;

  const yieldQty = parseFloat(rec[0].yieldQuantity) || 1;
  // Cost per portion includes both ingredients and labor
  const costPerPortion = (totalCost + laborCost) / yieldQty;

  await db
    .update(recipe)
    .set({
      totalCost: totalCost.toFixed(4),
      totalTime: prepTime,
      laborCost: laborCost.toFixed(4),
      costPerPortion: costPerPortion.toFixed(4),
      updatedAt: new Date(),
    })
    .where(eq(recipe.id, recipeId));

  // CASCADE: Find all recipes that use this recipe as an item
  const dependentRecipeItems = await db
    .select({
      recipeId: recipeItem.recipeId,
      id: recipeItem.id,
      quantity: recipeItem.quantity,
      unitId: recipeItem.unitId,
    })
    .from(recipeItem)
    .where(
      and(
        eq(recipeItem.type, "recipe"),
        eq(recipeItem.itemId, recipeId)
      )
    );

  for (const item of dependentRecipeItems) {
    // Recalculate item cost with updated recipe cost
    const newCalculatedCost = await calculateItemCost(
      "recipe",
      recipeId,
      parseFloat(item.quantity),
      item.unitId
    );

    await db
      .update(recipeItem)
      .set({ calculatedCost: newCalculatedCost.toFixed(4) })
      .where(eq(recipeItem.id, item.id));

    // Recursively recalculate the dependent recipe
    await recalculateRecipeCost(item.recipeId, visitedRecipes);
  }

  // CASCADE: Find all products that use this recipe in their composition
  const dependentProductCompositions = await db
    .select({
      productId: productComposition.productId,
      id: productComposition.id,
      quantity: productComposition.quantity,
      unitId: productComposition.unitId,
    })
    .from(productComposition)
    .where(
      and(
        eq(productComposition.type, "recipe"),
        eq(productComposition.itemId, recipeId)
      )
    );

  for (const comp of dependentProductCompositions) {
    // Get recipe's yield unit conversion factor
    const yieldUnit = await db.select({ conversionFactor: unit.conversionFactor }).from(unit).where(eq(unit.id, rec[0].yieldUnitId));
    const yieldConversionFactor = yieldUnit[0] ? parseFloat(yieldUnit[0].conversionFactor) : 1;

    // Get composition unit conversion factor
    let inputConversionFactor = 1;
    if (comp.unitId) {
      const inputUnit = await db.select({ conversionFactor: unit.conversionFactor }).from(unit).where(eq(unit.id, comp.unitId));
      inputConversionFactor = inputUnit[0] ? parseFloat(inputUnit[0].conversionFactor) : 1;
    }

    // Calculate new cost
    const quantityInBase = parseFloat(comp.quantity) * inputConversionFactor;
    const costPerBase = costPerPortion / yieldConversionFactor;
    const newCalculatedCost = costPerBase * quantityInBase;

    await db
      .update(productComposition)
      .set({ calculatedCost: newCalculatedCost.toFixed(4) })
      .where(eq(productComposition.id, comp.id));

    // Recalculate the dependent product (this will cascade to other products)
    await recalculateProductCostFromRecipe(comp.productId);
  }
}

// Helper function to recalculate product cost (called from recipe cascade)
async function recalculateProductCostFromRecipe(productId: string, visitedProducts: Set<string> = new Set()) {
  // Prevent infinite loops
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
    })
    .from(productComposition)
    .where(
      and(
        eq(productComposition.type, "product"),
        eq(productComposition.itemId, productId)
      )
    );

  for (const comp of dependentCompositions) {
    // Recalculate composition cost with updated product cost
    const newCalculatedCost = baseCost * parseFloat(comp.quantity);

    await db
      .update(productComposition)
      .set({ calculatedCost: newCalculatedCost.toFixed(4) })
      .where(eq(productComposition.id, comp.id));

    // Recursively recalculate the dependent product
    await recalculateProductCostFromRecipe(comp.productId, visitedProducts);
  }
}

// Get available items for recipe (ingredients, variations, recipes)
export async function getAvailableItemsForRecipe(workspaceSlug: string, currentRecipeId?: string) {
  await requireSession();
  const workspace = await getWorkspaceBySlug(workspaceSlug);

  if (!workspace) {
    return { ingredients: [], variations: [], recipes: [] };
  }

  // Get ingredients - show averagePrice for display, use baseCostPerUnit for calculations
  const ingredients = await db
    .select({
      id: ingredient.id,
      name: ingredient.name,
      unitId: ingredient.priceUnitId,
      unitAbbreviation: unit.abbreviation,
      averagePrice: ingredient.averagePrice,
      measurementType: ingredient.measurementType,
    })
    .from(ingredient)
    .leftJoin(unit, eq(ingredient.priceUnitId, unit.id))
    .where(eq(ingredient.workspaceId, workspace.id));

  // Get variations - calculatedCost is R$/base unit, multiply by conversionFactor for display
  const variations = await db
    .select({
      id: ingredientVariation.id,
      name: ingredientVariation.name,
      ingredientName: ingredient.name,
      unitId: ingredientVariation.unitId,
      unitAbbreviation: unit.abbreviation,
      unitConversionFactor: unit.conversionFactor,
      calculatedCost: ingredientVariation.calculatedCost,
      measurementType: ingredient.measurementType,
    })
    .from(ingredientVariation)
    .innerJoin(ingredient, eq(ingredientVariation.ingredientId, ingredient.id))
    .leftJoin(unit, eq(ingredientVariation.unitId, unit.id))
    .where(eq(ingredient.workspaceId, workspace.id));

  // Get recipes (excluding current one to prevent circular reference)
  const recipesQuery = db
    .select({
      id: recipe.id,
      name: recipe.name,
      unitId: recipe.yieldUnitId,
      unitAbbreviation: unit.abbreviation,
      costPerPortion: recipe.costPerPortion,
      measurementType: unit.measurementType,
    })
    .from(recipe)
    .leftJoin(unit, eq(recipe.yieldUnitId, unit.id))
    .where(eq(recipe.workspaceId, workspace.id));

  const recipes = await recipesQuery;

  return {
    ingredients: ingredients.map((i) => ({
      ...i,
      type: "ingredient" as const,
      displayName: i.name,
      // Show averagePrice for display (R$ per priceUnit, e.g. R$ 10/kg)
      cost: i.averagePrice,
    })),
    variations: variations.map((v) => {
      // calculatedCost is stored as R$/base unit (g/ml/un) after fix
      // Multiply by conversionFactor to show R$/variation unit (e.g. R$/kg)
      const conversionFactor = parseFloat(v.unitConversionFactor || "1");
      const costPerUnit = parseFloat(v.calculatedCost) * conversionFactor;
      return {
        ...v,
        type: "variation" as const,
        displayName: `${v.ingredientName} - ${v.name}`,
        cost: costPerUnit.toString(),
      };
    }),
    recipes: recipes
      .filter((r) => r.id !== currentRecipeId)
      .map((r) => ({
        ...r,
        type: "recipe" as const,
        displayName: r.name,
        cost: r.costPerPortion,
      })),
  };
}

// Recalculate all recipe costs for a workspace (used when labor cost changes)
export async function recalculateAllRecipeCosts(workspaceSlug: string) {
  await requireSession();
  const workspaceData = await getWorkspaceBySlug(workspaceSlug);

  if (!workspaceData) {
    return { error: "Workspace não encontrado" };
  }

  // Get all recipes for this workspace
  const recipes = await db
    .select({ id: recipe.id })
    .from(recipe)
    .where(eq(recipe.workspaceId, workspaceData.id));

  // Recalculate each recipe
  for (const rec of recipes) {
    await recalculateRecipeCost(rec.id);
  }

  revalidatePath(`/${workspaceSlug}/recipes`);
  return { success: true, count: recipes.length };
}
