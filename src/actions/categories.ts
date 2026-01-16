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

export async function getCategories(workspaceSlug: string, type?: CategoryType) {
  await requireSession();
  const workspace = await getWorkspaceBySlug(workspaceSlug);

  if (!workspace) {
    throw new Error("Workspace not found");
  }

  let query = db
    .select()
    .from(category)
    .where(eq(category.workspaceId, workspace.id));

  if (type) {
    query = db
      .select()
      .from(category)
      .where(and(eq(category.workspaceId, workspace.id), eq(category.type, type)));
  }

  const categories = await query;
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

export async function seedStandardCategories(workspaceId: string) {
  const standardCategories = [
    // Ingredientes
    { name: "Carnes", type: "ingredient" as const, color: "#ef4444" },
    { name: "Aves", type: "ingredient" as const, color: "#f97316" },
    { name: "Peixes e Frutos do Mar", type: "ingredient" as const, color: "#0ea5e9" },
    { name: "Laticínios", type: "ingredient" as const, color: "#fbbf24" },
    { name: "Vegetais", type: "ingredient" as const, color: "#22c55e" },
    { name: "Frutas", type: "ingredient" as const, color: "#a855f7" },
    { name: "Grãos e Cereais", type: "ingredient" as const, color: "#d97706" },
    { name: "Farinhas e Amidos", type: "ingredient" as const, color: "#eab308" },
    { name: "Temperos e Especiarias", type: "ingredient" as const, color: "#84cc16" },
    { name: "Óleos e Gorduras", type: "ingredient" as const, color: "#fcd34d" },
    { name: "Açúcares e Adoçantes", type: "ingredient" as const, color: "#fca5a1" },
    { name: "Bebidas", type: "ingredient" as const, color: "#60a5fa" },
    { name: "Embalagens", type: "ingredient" as const, color: "#9ca3af" },

    // Receitas
    { name: "Massas", type: "recipe" as const, color: "#fbbf24" },
    { name: "Molhos", type: "recipe" as const, color: "#ef4444" },
    { name: "Bases e Caldos", type: "recipe" as const, color: "#d97706" },
    { name: "Recheios", type: "recipe" as const, color: "#f472b6" },
    { name: "Coberturas", type: "recipe" as const, color: "#a78bfa" },
    { name: "Pães e Fermentados", type: "recipe" as const, color: "#fcd34d" },
    { name: "Sobremesas", type: "recipe" as const, color: "#f9a8d4" },

    // Produtos
    { name: "Pratos Principais", type: "product" as const, color: "#ef4444" },
    { name: "Entradas", type: "product" as const, color: "#22c55e" },
    { name: "Acompanhamentos", type: "product" as const, color: "#84cc16" },
    { name: "Sobremesas", type: "product" as const, color: "#f9a8d4" },
    { name: "Bebidas", type: "product" as const, color: "#60a5fa" },
    { name: "Lanches", type: "product" as const, color: "#fbbf24" },
    { name: "Combos", type: "product" as const, color: "#8b5cf6" },
  ];

  for (const c of standardCategories) {
    await db.insert(category).values({
      id: generateId("cat"),
      workspaceId,
      name: c.name,
      type: c.type,
      color: c.color,
    });
  }
}
