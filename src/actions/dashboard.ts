"use server";

import { db } from "@/lib/db";
import {
  workspace,
  ingredient,
  recipe,
  product,
  menu,
  entry,
  supplier,
  fixedCost,
} from "@/lib/db/schema";
import { eq, desc, count, sum, and } from "drizzle-orm";

export async function getDashboardMetrics(workspaceSlug: string) {
  const ws = await db.query.workspace.findFirst({
    where: eq(workspace.slug, workspaceSlug),
  });

  if (!ws) return null;

  const [
    ingredientsCount,
    recipesCount,
    productsResult,
    menusCount,
    suppliersCount,
    fixedCostsResult,
  ] = await Promise.all([
    db
      .select({ count: count() })
      .from(ingredient)
      .where(eq(ingredient.workspaceId, ws.id)),
    db
      .select({ count: count() })
      .from(recipe)
      .where(eq(recipe.workspaceId, ws.id)),
    db
      .select({
        count: count(),
        activeCount: count(product.active),
      })
      .from(product)
      .where(eq(product.workspaceId, ws.id)),
    db
      .select({ count: count() })
      .from(menu)
      .where(eq(menu.workspaceId, ws.id)),
    db
      .select({ count: count() })
      .from(supplier)
      .where(eq(supplier.workspaceId, ws.id)),
    db
      .select({
        total: sum(fixedCost.value),
      })
      .from(fixedCost)
      .where(and(eq(fixedCost.workspaceId, ws.id), eq(fixedCost.active, true))),
  ]);

  return {
    ingredients: ingredientsCount[0]?.count ?? 0,
    recipes: recipesCount[0]?.count ?? 0,
    products: productsResult[0]?.count ?? 0,
    menus: menusCount[0]?.count ?? 0,
    suppliers: suppliersCount[0]?.count ?? 0,
    monthlyFixedCosts: fixedCostsResult[0]?.total ?? "0",
  };
}

export async function getRecentEntries(workspaceSlug: string, limit = 5) {
  const ws = await db.query.workspace.findFirst({
    where: eq(workspace.slug, workspaceSlug),
  });

  if (!ws) return [];

  const entries = await db
    .select({
      id: entry.id,
      date: entry.date,
      quantity: entry.quantity,
      totalPrice: entry.totalPrice,
      ingredientId: ingredient.id,
      ingredientName: ingredient.name,
      supplierName: supplier.name,
    })
    .from(entry)
    .innerJoin(ingredient, eq(entry.ingredientId, ingredient.id))
    .leftJoin(supplier, eq(entry.supplierId, supplier.id))
    .where(eq(ingredient.workspaceId, ws.id))
    .orderBy(desc(entry.date), desc(entry.createdAt))
    .limit(limit);

  return entries;
}

export async function getTopCostProducts(workspaceSlug: string, limit = 5) {
  const ws = await db.query.workspace.findFirst({
    where: eq(workspace.slug, workspaceSlug),
  });

  if (!ws) return [];

  const products = await db
    .select({
      id: product.id,
      name: product.name,
      baseCost: product.baseCost,
      active: product.active,
    })
    .from(product)
    .where(eq(product.workspaceId, ws.id))
    .orderBy(desc(product.baseCost))
    .limit(limit);

  return products;
}

export async function getTopCostRecipes(workspaceSlug: string, limit = 5) {
  const ws = await db.query.workspace.findFirst({
    where: eq(workspace.slug, workspaceSlug),
  });

  if (!ws) return [];

  const recipes = await db
    .select({
      id: recipe.id,
      name: recipe.name,
      totalCost: recipe.totalCost,
      costPerPortion: recipe.costPerPortion,
    })
    .from(recipe)
    .where(eq(recipe.workspaceId, ws.id))
    .orderBy(desc(recipe.totalCost))
    .limit(limit);

  return recipes;
}
