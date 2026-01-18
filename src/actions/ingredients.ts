"use server";

import { revalidatePath } from "next/cache";
import { eq, and, sql, like, count, asc, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { ingredient, ingredientVariation, entry, unit, category, supplier, recipeItem, productComposition, recipe, product } from "@/lib/db/schema";
import { requireSession } from "@/lib/session";
import { getWorkspaceBySlug } from "./workspace";
import { generateId } from "@/lib/utils/id";

export interface IngredientsFilters {
  search?: string;
  categoryId?: string;
  hasVariations?: "true" | "false";
  page?: number;
  perPage?: number;
}

export async function getIngredients(workspaceSlug: string, filters?: IngredientsFilters) {
  await requireSession();
  const workspace = await getWorkspaceBySlug(workspaceSlug);

  if (!workspace) {
    throw new Error("Workspace not found");
  }

  const page = filters?.page || 1;
  const perPage = filters?.perPage || 15;
  const offset = (page - 1) * perPage;

  // Build conditions
  const conditions = [eq(ingredient.workspaceId, workspace.id)];

  if (filters?.search) {
    conditions.push(like(ingredient.name, `%${filters.search}%`));
  }

  if (filters?.categoryId) {
    conditions.push(eq(ingredient.categoryId, filters.categoryId));
  }

  if (filters?.hasVariations === "true") {
    conditions.push(eq(ingredient.hasVariations, true));
  } else if (filters?.hasVariations === "false") {
    conditions.push(eq(ingredient.hasVariations, false));
  }

  // Get total count
  const totalResult = await db
    .select({ count: count() })
    .from(ingredient)
    .where(and(...conditions));

  const total = totalResult[0]?.count || 0;

  // Get paginated results
  const ingredientsData = await db
    .select({
      id: ingredient.id,
      name: ingredient.name,
      description: ingredient.description,
      categoryId: ingredient.categoryId,
      categoryName: category.name,
      categoryColor: category.color,
      measurementType: ingredient.measurementType,
      priceUnitId: ingredient.priceUnitId,
      priceUnitAbbreviation: unit.abbreviation,
      averagePrice: ingredient.averagePrice,
      baseCostPerUnit: ingredient.baseCostPerUnit,
      averagePriceManual: ingredient.averagePriceManual,
      hasVariations: ingredient.hasVariations,
      availableForSale: ingredient.availableForSale,
      tags: ingredient.tags,
      createdAt: ingredient.createdAt,
      updatedAt: ingredient.updatedAt,
    })
    .from(ingredient)
    .leftJoin(category, eq(ingredient.categoryId, category.id))
    .leftJoin(unit, eq(ingredient.priceUnitId, unit.id))
    .where(and(...conditions))
    .orderBy(asc(ingredient.name))
    .limit(perPage)
    .offset(offset);

  // Get variation names for ingredients that have variations
  const ingredientIds = ingredientsData.filter(i => i.hasVariations).map(i => i.id);
  let variationsMap: Record<string, string[]> = {};

  if (ingredientIds.length > 0) {
    const variations = await db
      .select({
        ingredientId: ingredientVariation.ingredientId,
        name: ingredientVariation.name,
      })
      .from(ingredientVariation)
      .where(sql`${ingredientVariation.ingredientId} IN (${sql.join(ingredientIds.map(id => sql`${id}`), sql`, `)})`);

    variationsMap = variations.reduce((acc, v) => {
      if (!acc[v.ingredientId]) {
        acc[v.ingredientId] = [];
      }
      acc[v.ingredientId].push(v.name);
      return acc;
    }, {} as Record<string, string[]>);
  }

  const ingredients = ingredientsData.map(i => ({
    ...i,
    variationNames: variationsMap[i.id] || [],
  }));

  return {
    ingredients,
    pagination: {
      page,
      perPage,
      total,
      totalPages: Math.ceil(total / perPage),
    },
  };
}

export async function getIngredient(workspaceSlug: string, ingredientId: string) {
  await requireSession();
  const workspace = await getWorkspaceBySlug(workspaceSlug);

  if (!workspace) {
    throw new Error("Workspace not found");
  }

  const result = await db
    .select({
      id: ingredient.id,
      name: ingredient.name,
      description: ingredient.description,
      categoryId: ingredient.categoryId,
      categoryName: category.name,
      measurementType: ingredient.measurementType,
      priceUnitId: ingredient.priceUnitId,
      priceUnitName: unit.name,
      priceUnitAbbreviation: unit.abbreviation,
      priceUnitConversionFactor: unit.conversionFactor,
      averagePrice: ingredient.averagePrice,
      baseCostPerUnit: ingredient.baseCostPerUnit,
      averagePriceManual: ingredient.averagePriceManual,
      hasVariations: ingredient.hasVariations,
      availableForSale: ingredient.availableForSale,
      tags: ingredient.tags,
      createdAt: ingredient.createdAt,
      updatedAt: ingredient.updatedAt,
    })
    .from(ingredient)
    .leftJoin(category, eq(ingredient.categoryId, category.id))
    .leftJoin(unit, eq(ingredient.priceUnitId, unit.id))
    .where(
      and(eq(ingredient.id, ingredientId), eq(ingredient.workspaceId, workspace.id))
    );

  return result[0] || null;
}

export async function createIngredient(workspaceSlug: string, formData: FormData) {
  await requireSession();
  const workspace = await getWorkspaceBySlug(workspaceSlug);

  if (!workspace) {
    return { error: "Workspace não encontrado" };
  }

  const name = formData.get("name") as string;
  const description = formData.get("description") as string | null;
  const categoryId = formData.get("categoryId") as string | null;
  const measurementType = formData.get("measurementType") as "weight" | "volume" | "unit";
  const priceUnitId = formData.get("priceUnitId") as string;
  const priceQuantity = formData.get("priceQuantity") as string;
  const priceValue = formData.get("averagePrice") as string;

  if (!name || !measurementType || !priceUnitId) {
    return { error: "Nome, tipo de medida e unidade são obrigatórios" };
  }

  // Get the price unit to calculate base cost
  const priceUnit = await db.select().from(unit).where(eq(unit.id, priceUnitId));
  if (!priceUnit[0]) {
    return { error: "Unidade não encontrada" };
  }

  const quantity = parseFloat(priceQuantity || "1");
  const totalPrice = parseFloat(priceValue || "0");
  const conversionFactor = parseFloat(priceUnit[0].conversionFactor);

  // Calculate price per 1 unit: totalPrice / quantity
  // Ex: R$5 for 100g → R$5/100 = R$0.05/g
  const averagePrice = quantity > 0 ? totalPrice / quantity : 0;

  // baseCostPerUnit = averagePrice / conversionFactor
  // Ex: R$0.05/g → R$0.05/1 = R$0.05 (base)
  // Ex: R$50/kg → R$50/1000 = R$0.05 (base)
  const baseCostPerUnit = conversionFactor > 0 ? averagePrice / conversionFactor : 0;

  const id = generateId("ing");

  await db.insert(ingredient).values({
    id,
    workspaceId: workspace.id,
    name: name.trim(),
    description: description?.trim() || null,
    categoryId: categoryId || null,
    measurementType,
    priceUnitId,
    averagePrice: averagePrice.toFixed(4),
    baseCostPerUnit: baseCostPerUnit.toFixed(6),
    averagePriceManual: totalPrice > 0,
    hasVariations: false,
  });

  revalidatePath(`/${workspaceSlug}/ingredients`);
  return { success: true, id };
}

export async function updateIngredient(
  workspaceSlug: string,
  ingredientId: string,
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
  const measurementType = formData.get("measurementType") as "weight" | "volume" | "unit";
  const priceUnitId = formData.get("priceUnitId") as string;
  const priceQuantity = formData.get("priceQuantity") as string | null;
  const priceValue = formData.get("averagePrice") as string | null;
  const availableForSale = formData.get("availableForSale") === "true";

  if (!name || !measurementType || !priceUnitId) {
    return { error: "Nome, tipo de medida e unidade são obrigatórios" };
  }

  // Get the price unit to calculate base cost
  const priceUnit = await db.select().from(unit).where(eq(unit.id, priceUnitId));
  if (!priceUnit[0]) {
    return { error: "Unidade não encontrada" };
  }

  const updateData: Record<string, unknown> = {
    name: name.trim(),
    description: description?.trim() || null,
    categoryId: categoryId || null,
    measurementType,
    priceUnitId,
    availableForSale,
    updatedAt: new Date(),
  };

  // Only update price if provided
  if (priceValue !== null && priceValue !== "") {
    const quantity = parseFloat(priceQuantity || "1");
    const totalPrice = parseFloat(priceValue);
    const conversionFactor = parseFloat(priceUnit[0].conversionFactor);

    // Calculate price per 1 unit: totalPrice / quantity
    const averagePrice = quantity > 0 ? totalPrice / quantity : 0;
    const baseCostPerUnit = conversionFactor > 0 ? averagePrice / conversionFactor : 0;

    updateData.averagePrice = averagePrice.toFixed(4);
    updateData.baseCostPerUnit = baseCostPerUnit.toFixed(6);
    updateData.averagePriceManual = true;
  }

  await db
    .update(ingredient)
    .set(updateData)
    .where(
      and(eq(ingredient.id, ingredientId), eq(ingredient.workspaceId, workspace.id))
    );

  // Recalculate variation costs with new base cost
  if (priceValue !== null && priceValue !== "") {
    const ing = await getIngredient(workspaceSlug, ingredientId);
    if (ing) {
      await recalculateVariationCosts(ingredientId, parseFloat(ing.baseCostPerUnit));
    }
  }

  revalidatePath(`/${workspaceSlug}/ingredients`);
  revalidatePath(`/${workspaceSlug}/ingredients/${ingredientId}`);
  return { success: true };
}

export async function deleteIngredient(workspaceSlug: string, ingredientId: string) {
  await requireSession();
  const workspace = await getWorkspaceBySlug(workspaceSlug);

  if (!workspace) {
    return { error: "Workspace não encontrado" };
  }

  // TODO: Check if ingredient is in use (recipes, products) before deleting

  await db
    .delete(ingredient)
    .where(
      and(eq(ingredient.id, ingredientId), eq(ingredient.workspaceId, workspace.id))
    );

  revalidatePath(`/${workspaceSlug}/ingredients`);
  return { success: true };
}

// Variations
export async function getVariations(ingredientId: string) {
  await requireSession();

  const variations = await db
    .select({
      id: ingredientVariation.id,
      name: ingredientVariation.name,
      yieldPercentage: ingredientVariation.yieldPercentage,
      unitId: ingredientVariation.unitId,
      unitAbbreviation: unit.abbreviation,
      equivalenceQuantity: ingredientVariation.equivalenceQuantity,
      calculatedCost: ingredientVariation.calculatedCost,
    })
    .from(ingredientVariation)
    .leftJoin(unit, eq(ingredientVariation.unitId, unit.id))
    .where(eq(ingredientVariation.ingredientId, ingredientId));

  return variations;
}

export async function createVariation(
  workspaceSlug: string,
  ingredientId: string,
  formData: FormData
) {
  await requireSession();

  const name = formData.get("name") as string;
  const inputQuantity = formData.get("inputQuantity") as string;
  const inputUnitId = formData.get("inputUnitId") as string;
  const outputQuantity = formData.get("outputQuantity") as string;
  const outputUnitId = formData.get("outputUnitId") as string;

  if (!name || !inputQuantity || !inputUnitId || !outputQuantity || !outputUnitId) {
    return { error: "Todos os campos são obrigatórios" };
  }

  // Get ingredient to calculate cost
  const ing = await getIngredient(workspaceSlug, ingredientId);
  if (!ing) {
    return { error: "Ingrediente não encontrado" };
  }

  // Get input and output units
  const inputUnit = await db.select().from(unit).where(eq(unit.id, inputUnitId));
  const outputUnit = await db.select().from(unit).where(eq(unit.id, outputUnitId));

  if (!inputUnit[0] || !outputUnit[0]) {
    return { error: "Unidade não encontrada" };
  }

  // Convert quantities to base units
  const inputInBase = parseFloat(inputQuantity) * parseFloat(inputUnit[0].conversionFactor);
  const outputInBase = parseFloat(outputQuantity) * parseFloat(outputUnit[0].conversionFactor);

  if (inputInBase <= 0) {
    return { error: "Quantidade de entrada deve ser maior que zero" };
  }

  // Calculate yield percentage: (output / input) * 100
  const yieldPct = (outputInBase / inputInBase) * 100;
  const yieldPercentage = yieldPct.toFixed(2);

  // Output unit becomes the variation's unit
  const unitId = outputUnitId;
  const outputConversionFactor = parseFloat(outputUnit[0].conversionFactor);

  // Calculate cost per BASE unit (g/ml/un), considering yield
  // Cost = baseCostPerUnit / yieldDecimal
  // Ex: base cost R$0.05/g, yield 95%
  // Cost = 0.05 / 0.95 = R$0.0526/g
  const baseCost = parseFloat(ing.baseCostPerUnit);
  const calculatedCost = baseCost / (yieldPct / 100);

  // equivalenceQuantity = conversion factor of output unit (how many base units in 1 output unit)
  const equivalenceQuantity = outputConversionFactor.toString();

  const id = generateId("var");

  await db.insert(ingredientVariation).values({
    id,
    ingredientId,
    name: name.trim(),
    yieldPercentage,
    unitId,
    equivalenceQuantity,
    calculatedCost: calculatedCost.toFixed(4),
  });

  // Auto-update hasVariations flag
  await db
    .update(ingredient)
    .set({ hasVariations: true })
    .where(eq(ingredient.id, ingredientId));

  revalidatePath(`/${workspaceSlug}/ingredients/${ingredientId}`);
  return { success: true, id };
}

export async function updateVariation(
  workspaceSlug: string,
  ingredientId: string,
  variationId: string,
  formData: FormData
) {
  await requireSession();

  const name = formData.get("name") as string;
  const inputQuantity = formData.get("inputQuantity") as string;
  const inputUnitId = formData.get("inputUnitId") as string;
  const outputQuantity = formData.get("outputQuantity") as string;
  const outputUnitId = formData.get("outputUnitId") as string;

  if (!name || !inputQuantity || !inputUnitId || !outputQuantity || !outputUnitId) {
    return { error: "Todos os campos são obrigatórios" };
  }

  // Get ingredient to recalculate cost
  const ing = await getIngredient(workspaceSlug, ingredientId);
  if (!ing) {
    return { error: "Ingrediente não encontrado" };
  }

  // Get input and output units
  const inputUnit = await db.select().from(unit).where(eq(unit.id, inputUnitId));
  const outputUnit = await db.select().from(unit).where(eq(unit.id, outputUnitId));

  if (!inputUnit[0] || !outputUnit[0]) {
    return { error: "Unidade não encontrada" };
  }

  // Convert quantities to base units
  const inputInBase = parseFloat(inputQuantity) * parseFloat(inputUnit[0].conversionFactor);
  const outputInBase = parseFloat(outputQuantity) * parseFloat(outputUnit[0].conversionFactor);

  if (inputInBase <= 0) {
    return { error: "Quantidade de entrada deve ser maior que zero" };
  }

  // Calculate yield percentage: (output / input) * 100
  const yieldPct = (outputInBase / inputInBase) * 100;
  const yieldPercentage = yieldPct.toFixed(2);

  // Output unit becomes the variation's unit
  const unitId = outputUnitId;
  const outputConversionFactor = parseFloat(outputUnit[0].conversionFactor);

  // Calculate cost per BASE unit (g/ml/un), considering yield
  const baseCost = parseFloat(ing.baseCostPerUnit);
  const calculatedCost = baseCost / (yieldPct / 100);

  // equivalenceQuantity = conversion factor of output unit
  const equivalenceQuantity = outputConversionFactor.toString();

  await db
    .update(ingredientVariation)
    .set({
      name: name.trim(),
      yieldPercentage,
      unitId,
      equivalenceQuantity,
      calculatedCost: calculatedCost.toFixed(4),
      updatedAt: new Date(),
    })
    .where(eq(ingredientVariation.id, variationId));

  revalidatePath(`/${workspaceSlug}/ingredients/${ingredientId}`);
  return { success: true };
}

export async function deleteVariation(
  workspaceSlug: string,
  ingredientId: string,
  variationId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireSession();

    // TODO: Check if variation is in use before deleting

    await db.delete(ingredientVariation).where(eq(ingredientVariation.id, variationId));

    // Check if there are any remaining variations
    const remainingVariations = await db
      .select({ id: ingredientVariation.id })
      .from(ingredientVariation)
      .where(eq(ingredientVariation.ingredientId, ingredientId))
      .limit(1);

    // Auto-update hasVariations flag
    if (remainingVariations.length === 0) {
      await db
        .update(ingredient)
        .set({ hasVariations: false })
        .where(eq(ingredient.id, ingredientId));
    }

    revalidatePath(`/${workspaceSlug}/ingredients/${ingredientId}`);
    return { success: true };
  } catch {
    return { success: false, error: "Erro ao excluir variação" };
  }
}

// Entries
export async function getEntries(ingredientId: string) {
  await requireSession();

  const entries = await db
    .select({
      id: entry.id,
      date: entry.date,
      quantity: entry.quantity,
      unitId: entry.unitId,
      unitAbbreviation: unit.abbreviation,
      unitConversionFactor: unit.conversionFactor,
      unitPrice: entry.unitPrice,
      totalPrice: entry.totalPrice,
      supplierId: entry.supplierId,
      supplierName: supplier.name,
      observation: entry.observation,
      createdAt: entry.createdAt,
    })
    .from(entry)
    .leftJoin(unit, eq(entry.unitId, unit.id))
    .leftJoin(supplier, eq(entry.supplierId, supplier.id))
    .where(eq(entry.ingredientId, ingredientId))
    .orderBy(sql`${entry.date} DESC`);

  return entries;
}

export async function createEntry(
  workspaceSlug: string,
  ingredientId: string,
  formData: FormData
) {
  await requireSession();

  const date = formData.get("date") as string;
  const quantity = formData.get("quantity") as string;
  const unitId = formData.get("unitId") as string;
  const unitPrice = formData.get("unitPrice") as string;
  const supplierId = formData.get("supplierId") as string | null;
  const observation = formData.get("observation") as string | null;
  const updateAveragePrice = formData.get("updateAveragePrice") === "true";

  if (!date || !quantity || !unitId || !unitPrice) {
    return { error: "Data, quantidade, unidade e preço são obrigatórios" };
  }

  // Get the entry unit to calculate total in base units
  const entryUnit = await db.select().from(unit).where(eq(unit.id, unitId));
  if (!entryUnit[0]) {
    return { error: "Unidade não encontrada" };
  }

  const qty = parseFloat(quantity);
  const totalPriceValue = parseFloat(unitPrice); // unitPrice field contains total price
  const calculatedUnitPrice = qty > 0 ? totalPriceValue / qty : 0;

  const id = generateId("ent");

  await db.insert(entry).values({
    id,
    ingredientId,
    date,
    quantity,
    unitId,
    unitPrice: calculatedUnitPrice.toFixed(4),
    totalPrice: totalPriceValue.toFixed(4),
    supplierId: supplierId || null,
    observation: observation?.trim() || null,
  });

  // Update average price if requested
  if (updateAveragePrice) {
    // Get the ingredient's price unit
    const ing = await getIngredient(workspaceSlug, ingredientId);
    if (ing) {
      const entryConversionFactor = parseFloat(entryUnit[0].conversionFactor);
      const priceUnitConversionFactor = parseFloat(ing.priceUnitConversionFactor || "1");

      // Convert entry price to ingredient's price unit
      // calculatedUnitPrice is per entryUnit, we need to convert to per priceUnit
      // price per base = unitPrice / entryConversionFactor
      // price per priceUnit = pricePerBase * priceUnitConversionFactor
      const pricePerBase = calculatedUnitPrice / entryConversionFactor;
      const newAveragePrice = pricePerBase * priceUnitConversionFactor;

      const baseCostPerUnit = newAveragePrice / priceUnitConversionFactor;

      await db
        .update(ingredient)
        .set({
          averagePrice: newAveragePrice.toFixed(4),
          baseCostPerUnit: baseCostPerUnit.toFixed(6),
          averagePriceManual: true,
          updatedAt: new Date(),
        })
        .where(eq(ingredient.id, ingredientId));

      // Recalculate variation costs
      await recalculateVariationCosts(ingredientId, baseCostPerUnit);
    }
  } else {
    // Recalculate average price from all entries
    await recalculateAveragePrice(workspaceSlug, ingredientId);
  }

  revalidatePath(`/${workspaceSlug}/ingredients/${ingredientId}`);
  return { success: true, id };
}

export async function updateEntry(
  workspaceSlug: string,
  ingredientId: string,
  entryId: string,
  formData: FormData
) {
  await requireSession();

  const date = formData.get("date") as string;
  const quantity = formData.get("quantity") as string;
  const unitId = formData.get("unitId") as string;
  const unitPrice = formData.get("unitPrice") as string;
  const supplierId = formData.get("supplierId") as string | null;
  const observation = formData.get("observation") as string | null;

  if (!date || !quantity || !unitId || !unitPrice) {
    return { error: "Data, quantidade, unidade e preço são obrigatórios" };
  }

  // Get the entry unit to calculate total in base units
  const entryUnit = await db.select().from(unit).where(eq(unit.id, unitId));
  if (!entryUnit[0]) {
    return { error: "Unidade não encontrada" };
  }

  const qty = parseFloat(quantity);
  const totalPriceValue = parseFloat(unitPrice); // unitPrice field contains total price
  const calculatedUnitPrice = qty > 0 ? totalPriceValue / qty : 0;

  await db
    .update(entry)
    .set({
      date,
      quantity,
      unitId,
      unitPrice: calculatedUnitPrice.toFixed(4),
      totalPrice: totalPriceValue.toFixed(4),
      supplierId: supplierId || null,
      observation: observation?.trim() || null,
    })
    .where(eq(entry.id, entryId));

  // Recalculate average price from all entries
  await recalculateAveragePrice(workspaceSlug, ingredientId);

  revalidatePath(`/${workspaceSlug}/ingredients/${ingredientId}`);
  return { success: true };
}

export async function deleteEntry(
  workspaceSlug: string,
  ingredientId: string,
  entryId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireSession();

    await db.delete(entry).where(eq(entry.id, entryId));

    // Recalculate average price
    await recalculateAveragePrice(workspaceSlug, ingredientId);

    revalidatePath(`/${workspaceSlug}/ingredients/${ingredientId}`);
    return { success: true };
  } catch {
    return { success: false, error: "Erro ao excluir entrada" };
  }
}

async function recalculateAveragePrice(workspaceSlug: string, ingredientId: string) {
  const workspace = await getWorkspaceBySlug(workspaceSlug);
  if (!workspace) return;

  // Get ingredient with price unit info
  const ing = await db
    .select({
      averagePriceManual: ingredient.averagePriceManual,
      priceUnitId: ingredient.priceUnitId,
    })
    .from(ingredient)
    .where(eq(ingredient.id, ingredientId));

  if (ing[0]?.averagePriceManual) {
    return; // Don't recalculate if price is manual
  }

  // Get price unit conversion factor
  const priceUnit = await db.select().from(unit).where(eq(unit.id, ing[0].priceUnitId));
  const priceUnitConversionFactor = parseFloat(priceUnit[0]?.conversionFactor || "1");

  // Get all entries with their unit conversion factors
  const entries = await db
    .select({
      quantity: entry.quantity,
      unitPrice: entry.unitPrice,
      totalPrice: entry.totalPrice,
      unitConversionFactor: unit.conversionFactor,
    })
    .from(entry)
    .leftJoin(unit, eq(entry.unitId, unit.id))
    .where(eq(entry.ingredientId, ingredientId));

  if (entries.length === 0) {
    return; // No entries to calculate from
  }

  // Calculate weighted average in base units
  // totalValueInBase = sum of (quantity * unitConversionFactor * unitPrice / unitConversionFactor) = sum of totalPrice
  // totalQtyInBase = sum of (quantity * unitConversionFactor)
  let totalValueInBase = 0;
  let totalQtyInBase = 0;

  for (const e of entries) {
    const qty = parseFloat(e.quantity);
    const convFactor = parseFloat(e.unitConversionFactor || "1");
    const total = parseFloat(e.totalPrice);

    totalQtyInBase += qty * convFactor;
    totalValueInBase += total;
  }

  // Average price per base unit
  const baseCostPerUnit = totalQtyInBase > 0 ? totalValueInBase / totalQtyInBase : 0;

  // Convert to ingredient's price unit
  const averagePrice = baseCostPerUnit * priceUnitConversionFactor;

  await db
    .update(ingredient)
    .set({
      averagePrice: averagePrice.toFixed(4),
      baseCostPerUnit: baseCostPerUnit.toFixed(6),
      updatedAt: new Date(),
    })
    .where(eq(ingredient.id, ingredientId));

  // Recalculate variation costs using base cost
  await recalculateVariationCosts(ingredientId, baseCostPerUnit);

  // CASCADE: Recalculate recipes and products that use this ingredient directly
  await cascadeIngredientChanges(ingredientId, baseCostPerUnit);
}

async function recalculateVariationCosts(ingredientId: string, baseCostPerUnit: number) {
  const variations = await db
    .select({
      id: ingredientVariation.id,
      yieldPercentage: ingredientVariation.yieldPercentage,
    })
    .from(ingredientVariation)
    .where(eq(ingredientVariation.ingredientId, ingredientId));

  for (const v of variations) {
    const yieldPct = parseFloat(v.yieldPercentage) / 100;
    // Cost per BASE unit (g/ml/un), considering yield
    // Ex: base R$0.05/g, yield 95%
    // Cost = 0.05 / 0.95 = R$0.0526/g
    const calculatedCost = baseCostPerUnit / yieldPct;

    await db
      .update(ingredientVariation)
      .set({
        calculatedCost: calculatedCost.toFixed(4),
        updatedAt: new Date(),
      })
      .where(eq(ingredientVariation.id, v.id));

    // CASCADE: Recalculate recipes and products that use this variation
    await cascadeVariationChanges(v.id, calculatedCost);
  }
}

// Cascade ingredient changes to recipes and products
async function cascadeIngredientChanges(ingredientId: string, baseCostPerUnit: number) {
  // Find all recipe items that use this ingredient directly
  const recipeItemsList = await db
    .select({
      id: recipeItem.id,
      recipeId: recipeItem.recipeId,
      quantity: recipeItem.quantity,
      unitId: recipeItem.unitId,
    })
    .from(recipeItem)
    .where(
      and(
        eq(recipeItem.type, "ingredient"),
        eq(recipeItem.itemId, ingredientId)
      )
    );

  const processedRecipes = new Set<string>();

  for (const item of recipeItemsList) {
    // Get unit conversion factor
    const itemUnit = await db.select({ conversionFactor: unit.conversionFactor }).from(unit).where(eq(unit.id, item.unitId));
    const conversionFactor = itemUnit[0] ? parseFloat(itemUnit[0].conversionFactor) : 1;

    // Calculate new cost
    const quantityInBase = parseFloat(item.quantity) * conversionFactor;
    const newCalculatedCost = baseCostPerUnit * quantityInBase;

    await db
      .update(recipeItem)
      .set({ calculatedCost: newCalculatedCost.toFixed(4) })
      .where(eq(recipeItem.id, item.id));

    processedRecipes.add(item.recipeId);
  }

  // Recalculate affected recipes (they will cascade to products)
  for (const recipeId of processedRecipes) {
    await recalculateRecipeFromIngredient(recipeId);
  }

  // Find all product compositions that use this ingredient directly
  const productCompositionsList = await db
    .select({
      id: productComposition.id,
      productId: productComposition.productId,
      quantity: productComposition.quantity,
      unitId: productComposition.unitId,
    })
    .from(productComposition)
    .where(
      and(
        eq(productComposition.type, "ingredient"),
        eq(productComposition.itemId, ingredientId)
      )
    );

  const processedProducts = new Set<string>();

  for (const comp of productCompositionsList) {
    // Get unit conversion factor
    let conversionFactor = 1;
    if (comp.unitId) {
      const itemUnit = await db.select({ conversionFactor: unit.conversionFactor }).from(unit).where(eq(unit.id, comp.unitId));
      conversionFactor = itemUnit[0] ? parseFloat(itemUnit[0].conversionFactor) : 1;
    }

    // Calculate new cost
    const quantityInBase = parseFloat(comp.quantity) * conversionFactor;
    const newCalculatedCost = baseCostPerUnit * quantityInBase;

    await db
      .update(productComposition)
      .set({ calculatedCost: newCalculatedCost.toFixed(4) })
      .where(eq(productComposition.id, comp.id));

    processedProducts.add(comp.productId);
  }

  // Recalculate affected products
  for (const productId of processedProducts) {
    await recalculateProductFromIngredient(productId);
  }
}

// Cascade variation changes to recipes and products
async function cascadeVariationChanges(variationId: string, calculatedCost: number) {
  // Find all recipe items that use this variation
  const recipeItemsList = await db
    .select({
      id: recipeItem.id,
      recipeId: recipeItem.recipeId,
      quantity: recipeItem.quantity,
      unitId: recipeItem.unitId,
    })
    .from(recipeItem)
    .where(
      and(
        eq(recipeItem.type, "variation"),
        eq(recipeItem.itemId, variationId)
      )
    );

  const processedRecipes = new Set<string>();

  for (const item of recipeItemsList) {
    // Get unit conversion factor
    const itemUnit = await db.select({ conversionFactor: unit.conversionFactor }).from(unit).where(eq(unit.id, item.unitId));
    const conversionFactor = itemUnit[0] ? parseFloat(itemUnit[0].conversionFactor) : 1;

    // Calculate new cost
    const quantityInBase = parseFloat(item.quantity) * conversionFactor;
    const newCalculatedCost = calculatedCost * quantityInBase;

    await db
      .update(recipeItem)
      .set({ calculatedCost: newCalculatedCost.toFixed(4) })
      .where(eq(recipeItem.id, item.id));

    processedRecipes.add(item.recipeId);
  }

  // Recalculate affected recipes
  for (const recipeId of processedRecipes) {
    await recalculateRecipeFromIngredient(recipeId);
  }

  // Find all product compositions that use this variation
  const productCompositionsList = await db
    .select({
      id: productComposition.id,
      productId: productComposition.productId,
      quantity: productComposition.quantity,
      unitId: productComposition.unitId,
    })
    .from(productComposition)
    .where(
      and(
        eq(productComposition.type, "variation"),
        eq(productComposition.itemId, variationId)
      )
    );

  const processedProducts = new Set<string>();

  for (const comp of productCompositionsList) {
    // Get unit conversion factor
    let conversionFactor = 1;
    if (comp.unitId) {
      const itemUnit = await db.select({ conversionFactor: unit.conversionFactor }).from(unit).where(eq(unit.id, comp.unitId));
      conversionFactor = itemUnit[0] ? parseFloat(itemUnit[0].conversionFactor) : 1;
    }

    // Calculate new cost
    const quantityInBase = parseFloat(comp.quantity) * conversionFactor;
    const newCalculatedCost = calculatedCost * quantityInBase;

    await db
      .update(productComposition)
      .set({ calculatedCost: newCalculatedCost.toFixed(4) })
      .where(eq(productComposition.id, comp.id));

    processedProducts.add(comp.productId);
  }

  // Recalculate affected products
  for (const productId of processedProducts) {
    await recalculateProductFromIngredient(productId);
  }
}

// Helper to recalculate recipe and cascade (similar to recipes.ts but local)
async function recalculateRecipeFromIngredient(recipeId: string, visitedRecipes: Set<string> = new Set()) {
  if (visitedRecipes.has(recipeId)) return;
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

  // Get recipe info
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

  const prepTime = rec[0].prepTime || 0;

  // Get workspace labor cost
  const ws = await db
    .select({ laborCostPerHour: sql<string>`COALESCE(labor_cost_per_hour, '0')` })
    .from(sql`workspace`)
    .where(sql`id = ${rec[0].workspaceId}`);

  const laborCostPerHour = ws[0]?.laborCostPerHour ? parseFloat(ws[0].laborCostPerHour) : 0;
  const laborCost = (prepTime / 60) * laborCostPerHour;

  const yieldQty = parseFloat(rec[0].yieldQuantity) || 1;
  const costPerPortion = (totalCost + laborCost) / yieldQty;

  await db
    .update(recipe)
    .set({
      totalCost: totalCost.toFixed(4),
      laborCost: laborCost.toFixed(4),
      costPerPortion: costPerPortion.toFixed(4),
      updatedAt: new Date(),
    })
    .where(eq(recipe.id, recipeId));

  // CASCADE: Find recipes that use this recipe
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
    // Get recipe yield unit conversion
    const yieldUnit = await db.select({ conversionFactor: unit.conversionFactor }).from(unit).where(eq(unit.id, rec[0].yieldUnitId));
    const yieldConversionFactor = yieldUnit[0] ? parseFloat(yieldUnit[0].conversionFactor) : 1;

    // Get item unit conversion
    const itemUnit = await db.select({ conversionFactor: unit.conversionFactor }).from(unit).where(eq(unit.id, item.unitId));
    const inputConversionFactor = itemUnit[0] ? parseFloat(itemUnit[0].conversionFactor) : 1;

    // Calculate new cost
    const quantityInBase = parseFloat(item.quantity) * inputConversionFactor;
    const costPerBase = costPerPortion / yieldConversionFactor;
    const newCalculatedCost = costPerBase * quantityInBase;

    await db
      .update(recipeItem)
      .set({ calculatedCost: newCalculatedCost.toFixed(4) })
      .where(eq(recipeItem.id, item.id));

    await recalculateRecipeFromIngredient(item.recipeId, visitedRecipes);
  }

  // CASCADE: Find products that use this recipe
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
    // Get recipe yield unit conversion
    const yieldUnit = await db.select({ conversionFactor: unit.conversionFactor }).from(unit).where(eq(unit.id, rec[0].yieldUnitId));
    const yieldConversionFactor = yieldUnit[0] ? parseFloat(yieldUnit[0].conversionFactor) : 1;

    // Get composition unit conversion
    let inputConversionFactor = 1;
    if (comp.unitId) {
      const itemUnit = await db.select({ conversionFactor: unit.conversionFactor }).from(unit).where(eq(unit.id, comp.unitId));
      inputConversionFactor = itemUnit[0] ? parseFloat(itemUnit[0].conversionFactor) : 1;
    }

    // Calculate new cost
    const quantityInBase = parseFloat(comp.quantity) * inputConversionFactor;
    const costPerBase = costPerPortion / yieldConversionFactor;
    const newCalculatedCost = costPerBase * quantityInBase;

    await db
      .update(productComposition)
      .set({ calculatedCost: newCalculatedCost.toFixed(4) })
      .where(eq(productComposition.id, comp.id));

    await recalculateProductFromIngredient(comp.productId);
  }
}

// Helper to recalculate product and cascade
async function recalculateProductFromIngredient(productId: string, visitedProducts: Set<string> = new Set()) {
  if (visitedProducts.has(productId)) return;
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

  // CASCADE: Find products that use this product
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
    const newCalculatedCost = baseCost * parseFloat(comp.quantity);

    await db
      .update(productComposition)
      .set({ calculatedCost: newCalculatedCost.toFixed(4) })
      .where(eq(productComposition.id, comp.id));

    await recalculateProductFromIngredient(comp.productId, visitedProducts);
  }
}

// Recalculate all variations in a workspace (migration helper)
export async function recalculateAllVariations(workspaceSlug: string) {
  await requireSession();
  const workspace = await getWorkspaceBySlug(workspaceSlug);

  if (!workspace) {
    return { error: "Workspace não encontrado" };
  }

  // Get all ingredients with variations
  const ingredients = await db
    .select({
      id: ingredient.id,
      baseCostPerUnit: ingredient.baseCostPerUnit,
    })
    .from(ingredient)
    .where(eq(ingredient.workspaceId, workspace.id));

  let count = 0;
  for (const ing of ingredients) {
    const baseCost = parseFloat(ing.baseCostPerUnit);
    await recalculateVariationCosts(ing.id, baseCost);
    count++;
  }

  revalidatePath(`/${workspaceSlug}`);
  return { success: true, ingredientsProcessed: count };
}
