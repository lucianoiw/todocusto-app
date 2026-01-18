"use server";

import { revalidatePath } from "next/cache";
import { eq, and, ilike, count } from "drizzle-orm";
import { db } from "@/lib/db";
import { category } from "@/lib/db/schema";
import { requireSession } from "@/lib/session";
import { getWorkspaceBySlug } from "./workspace";
import { generateId } from "@/lib/utils/id";

export type CategoryType = "ingredient" | "recipe" | "product";

export interface CategoriesFilters {
  search?: string;
  type?: CategoryType;
}

export async function getAllCategories(workspaceSlug: string, filters?: CategoriesFilters) {
  await requireSession();
  const workspace = await getWorkspaceBySlug(workspaceSlug);

  if (!workspace) {
    throw new Error("Workspace not found");
  }

  // Build conditions
  const conditions = [eq(category.workspaceId, workspace.id)];

  if (filters?.search) {
    conditions.push(ilike(category.name, `%${filters.search}%`));
  }

  if (filters?.type) {
    conditions.push(eq(category.type, filters.type));
  }

  const categories = await db
    .select()
    .from(category)
    .where(and(...conditions))
    .orderBy(category.name);

  // Group by type
  const ingredientCategories = categories.filter((c) => c.type === "ingredient");
  const recipeCategories = categories.filter((c) => c.type === "recipe");
  const productCategories = categories.filter((c) => c.type === "product");

  return {
    all: categories,
    ingredient: ingredientCategories,
    recipe: recipeCategories,
    product: productCategories,
  };
}

export async function getCategories(
  workspaceSlug: string,
  type?: CategoryType,
  includeInactive: boolean = false
) {
  await requireSession();
  const workspace = await getWorkspaceBySlug(workspaceSlug);

  if (!workspace) {
    throw new Error("Workspace not found");
  }

  const conditions = [eq(category.workspaceId, workspace.id)];

  if (type) {
    conditions.push(eq(category.type, type));
  }

  // By default, only return active categories (for use in selects)
  if (!includeInactive) {
    conditions.push(eq(category.active, true));
  }

  const categories = await db
    .select()
    .from(category)
    .where(and(...conditions))
    .orderBy(category.name);

  return categories;
}

export async function getCategory(workspaceSlug: string, categoryId: string) {
  await requireSession();
  const workspace = await getWorkspaceBySlug(workspaceSlug);

  if (!workspace) {
    throw new Error("Workspace not found");
  }

  const result = await db
    .select()
    .from(category)
    .where(and(eq(category.id, categoryId), eq(category.workspaceId, workspace.id)));

  return result[0] || null;
}

export async function createCategory(workspaceSlug: string, formData: FormData) {
  await requireSession();
  const workspace = await getWorkspaceBySlug(workspaceSlug);

  if (!workspace) {
    return { error: "Workspace não encontrado" };
  }

  const name = formData.get("name") as string;
  const type = formData.get("type") as CategoryType;
  const color = formData.get("color") as string | null;
  const icon = formData.get("icon") as string | null;

  if (!name || !type) {
    return { error: "Nome e tipo são obrigatórios" };
  }

  const id = generateId("cat");

  await db.insert(category).values({
    id,
    workspaceId: workspace.id,
    name: name.trim(),
    type,
    color: color || null,
    icon: icon || null,
  });

  revalidatePath(`/${workspaceSlug}/categories`);
  return { success: true, id };
}

export async function updateCategory(
  workspaceSlug: string,
  categoryId: string,
  formData: FormData
) {
  await requireSession();
  const workspace = await getWorkspaceBySlug(workspaceSlug);

  if (!workspace) {
    return { error: "Workspace não encontrado" };
  }

  const name = formData.get("name") as string;
  const type = formData.get("type") as CategoryType;
  const color = formData.get("color") as string | null;
  const icon = formData.get("icon") as string | null;

  if (!name || !type) {
    return { error: "Nome e tipo são obrigatórios" };
  }

  await db
    .update(category)
    .set({
      name: name.trim(),
      type,
      color: color || null,
      icon: icon || null,
      updatedAt: new Date(),
    })
    .where(and(eq(category.id, categoryId), eq(category.workspaceId, workspace.id)));

  revalidatePath(`/${workspaceSlug}/categories`);
  return { success: true };
}

export async function deleteCategory(workspaceSlug: string, categoryId: string) {
  await requireSession();
  const workspace = await getWorkspaceBySlug(workspaceSlug);

  if (!workspace) {
    return { error: "Workspace não encontrado" };
  }

  // TODO: Check if category is in use before deleting

  await db
    .delete(category)
    .where(and(eq(category.id, categoryId), eq(category.workspaceId, workspace.id)));

  revalidatePath(`/${workspaceSlug}/categories`);
  return { success: true };
}

export async function seedStandardCategories(
  workspaceId: string,
  establishmentType: "pizzeria" | "burger_shop" | "bar" | "bakery" | "restaurant" | "other" = "other"
) {
  const { STANDARD_CATEGORIES, isCategoryActiveForEstablishment } = await import("@/lib/config/establishment-types");

  for (const c of STANDARD_CATEGORIES) {
    const isActive = isCategoryActiveForEstablishment(c.establishments, establishmentType);
    await db.insert(category).values({
      id: generateId("cat"),
      workspaceId,
      name: c.name,
      type: c.type,
      color: c.color,
      active: isActive,
    });
  }
}

export async function toggleCategoryActive(
  workspaceSlug: string,
  categoryId: string,
  active: boolean
) {
  await requireSession();
  const workspace = await getWorkspaceBySlug(workspaceSlug);

  if (!workspace) {
    return { error: "Workspace não encontrado" };
  }

  await db
    .update(category)
    .set({ active, updatedAt: new Date() })
    .where(and(eq(category.id, categoryId), eq(category.workspaceId, workspace.id)));

  revalidatePath(`/${workspaceSlug}/categories`);
  return { success: true };
}
