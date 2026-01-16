"use server";

import { revalidatePath } from "next/cache";
import { eq, and, sql, like, count, asc, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { ingredient, ingredientVariation, entry, unit, category, supplier } from "@/lib/db/schema";
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
  const ingredients = await db
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
  const hasVariations = formData.get("hasVariations") === "true";

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
    hasVariations,
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
  const hasVariations = formData.get("hasVariations") === "true";

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
    hasVariations,
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
  const yieldPercentage = formData.get("yieldPercentage") as string;
  const unitId = formData.get("unitId") as string;
  const equivalenceQuantity = formData.get("equivalenceQuantity") as string;

  if (!name || !yieldPercentage || !unitId || !equivalenceQuantity) {
    return { error: "Todos os campos são obrigatórios" };
  }

  // Get ingredient to recalculate cost
  const ing = await getIngredient(workspaceSlug, ingredientId);
  if (!ing) {
    return { error: "Ingrediente não encontrado" };
  }

  // Get variation unit for conversion
  const varUnit = await db.select().from(unit).where(eq(unit.id, unitId));
  if (!varUnit[0]) {
    return { error: "Unidade não encontrada" };
  }

  const baseCost = parseFloat(ing.baseCostPerUnit);
  const yieldPct = parseFloat(yieldPercentage) / 100;
  // Cost per BASE unit (g/ml/un), considering yield
  const calculatedCost = baseCost / yieldPct;

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
  const price = parseFloat(unitPrice);
  const totalPrice = qty * price;

  const id = generateId("ent");

  await db.insert(entry).values({
    id,
    ingredientId,
    date,
    quantity,
    unitId,
    unitPrice,
    totalPrice: totalPrice.toFixed(4),
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
      // entryPrice is per entryUnit, we need to convert to per priceUnit
      // price per base = entryPrice / entryConversionFactor
      // price per priceUnit = pricePerBase * priceUnitConversionFactor
      const pricePerBase = price / entryConversionFactor;
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
