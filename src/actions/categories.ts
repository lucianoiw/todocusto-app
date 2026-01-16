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
    // ==================== INGREDIENTES ====================
    // Proteínas
    { name: "Carnes Bovinas", type: "ingredient" as const, color: "#ef4444" },
    { name: "Carnes Suínas", type: "ingredient" as const, color: "#f87171" },
    { name: "Aves", type: "ingredient" as const, color: "#f97316" },
    { name: "Peixes e Frutos do Mar", type: "ingredient" as const, color: "#0ea5e9" },
    { name: "Embutidos e Frios", type: "ingredient" as const, color: "#fb7185" },
    { name: "Ovos", type: "ingredient" as const, color: "#fcd34d" },

    // Laticínios e Queijos
    { name: "Leite e Derivados", type: "ingredient" as const, color: "#fbbf24" },
    { name: "Queijos", type: "ingredient" as const, color: "#facc15" },
    { name: "Manteigas e Cremes", type: "ingredient" as const, color: "#fde047" },

    // Vegetais e Frutas
    { name: "Vegetais e Legumes", type: "ingredient" as const, color: "#22c55e" },
    { name: "Folhas e Ervas", type: "ingredient" as const, color: "#4ade80" },
    { name: "Frutas", type: "ingredient" as const, color: "#a855f7" },
    { name: "Cogumelos", type: "ingredient" as const, color: "#a1a1aa" },

    // Grãos e Farináceos
    { name: "Grãos e Cereais", type: "ingredient" as const, color: "#d97706" },
    { name: "Farinhas e Amidos", type: "ingredient" as const, color: "#eab308" },
    { name: "Massas Secas", type: "ingredient" as const, color: "#ca8a04" },
    { name: "Pães e Bases Prontas", type: "ingredient" as const, color: "#b45309" },

    // Temperos e Condimentos
    { name: "Temperos e Especiarias", type: "ingredient" as const, color: "#84cc16" },
    { name: "Molhos Prontos", type: "ingredient" as const, color: "#dc2626" },
    { name: "Conservas e Enlatados", type: "ingredient" as const, color: "#78716c" },

    // Doces e Confeitaria
    { name: "Açúcares e Adoçantes", type: "ingredient" as const, color: "#fca5a1" },
    { name: "Chocolates e Cacau", type: "ingredient" as const, color: "#78350f" },
    { name: "Confeitaria e Decoração", type: "ingredient" as const, color: "#ec4899" },
    { name: "Fermentos e Leveduras", type: "ingredient" as const, color: "#d4d4d4" },

    // Óleos e Gorduras
    { name: "Óleos e Azeites", type: "ingredient" as const, color: "#a3e635" },
    { name: "Gorduras", type: "ingredient" as const, color: "#fef08a" },

    // Bebidas
    { name: "Bebidas", type: "ingredient" as const, color: "#60a5fa" },
    { name: "Bebidas Alcoólicas", type: "ingredient" as const, color: "#7c3aed" },

    // Outros
    { name: "Embalagens", type: "ingredient" as const, color: "#9ca3af" },
    { name: "Descartáveis", type: "ingredient" as const, color: "#6b7280" },

    // ==================== RECEITAS ====================
    // Massas e Bases
    { name: "Massas de Pizza", type: "recipe" as const, color: "#fbbf24" },
    { name: "Massas de Pão", type: "recipe" as const, color: "#f59e0b" },
    { name: "Massas Folhadas", type: "recipe" as const, color: "#d97706" },
    { name: "Massas de Salgados", type: "recipe" as const, color: "#b45309" },
    { name: "Massas de Bolo", type: "recipe" as const, color: "#fcd34d" },
    { name: "Massas de Torta", type: "recipe" as const, color: "#eab308" },

    // Molhos e Caldos
    { name: "Molhos", type: "recipe" as const, color: "#ef4444" },
    { name: "Caldos e Fundos", type: "recipe" as const, color: "#92400e" },
    { name: "Marinadas e Temperos", type: "recipe" as const, color: "#84cc16" },

    // Recheios e Cremes
    { name: "Recheios Salgados", type: "recipe" as const, color: "#f472b6" },
    { name: "Recheios Doces", type: "recipe" as const, color: "#f9a8d4" },
    { name: "Cremes e Mousses", type: "recipe" as const, color: "#fbcfe8" },
    { name: "Ganaches", type: "recipe" as const, color: "#7c2d12" },

    // Coberturas e Finalizações
    { name: "Coberturas", type: "recipe" as const, color: "#a78bfa" },
    { name: "Caldas e Xaropes", type: "recipe" as const, color: "#c084fc" },
    { name: "Glacês e Fondant", type: "recipe" as const, color: "#e9d5ff" },

    // Preparações Prontas
    { name: "Carnes Preparadas", type: "recipe" as const, color: "#dc2626" },
    { name: "Vegetais Preparados", type: "recipe" as const, color: "#22c55e" },
    { name: "Montagens", type: "recipe" as const, color: "#64748b" },

    // ==================== PRODUTOS ====================
    // Pizzas e Massas
    { name: "Pizzas Tradicionais", type: "product" as const, color: "#ef4444" },
    { name: "Pizzas Especiais", type: "product" as const, color: "#dc2626" },
    { name: "Pizzas Doces", type: "product" as const, color: "#f472b6" },
    { name: "Calzones", type: "product" as const, color: "#ea580c" },
    { name: "Esfihas", type: "product" as const, color: "#c2410c" },
    { name: "Massas e Pastas", type: "product" as const, color: "#fbbf24" },

    // Lanches
    { name: "Hambúrgueres", type: "product" as const, color: "#b45309" },
    { name: "Sanduíches", type: "product" as const, color: "#d97706" },
    { name: "Hot Dogs", type: "product" as const, color: "#f97316" },
    { name: "Wraps e Burritos", type: "product" as const, color: "#fb923c" },

    // Salgados
    { name: "Salgados Fritos", type: "product" as const, color: "#ca8a04" },
    { name: "Salgados Assados", type: "product" as const, color: "#eab308" },
    { name: "Empanados", type: "product" as const, color: "#fcd34d" },

    // Pratos
    { name: "Pratos Principais", type: "product" as const, color: "#b91c1c" },
    { name: "Entradas", type: "product" as const, color: "#22c55e" },
    { name: "Acompanhamentos", type: "product" as const, color: "#84cc16" },
    { name: "Porções", type: "product" as const, color: "#65a30d" },
    { name: "Saladas", type: "product" as const, color: "#4ade80" },

    // Padaria
    { name: "Pães", type: "product" as const, color: "#92400e" },
    { name: "Pães Recheados", type: "product" as const, color: "#a16207" },

    // Confeitaria
    { name: "Bolos", type: "product" as const, color: "#f9a8d4" },
    { name: "Tortas", type: "product" as const, color: "#ec4899" },
    { name: "Doces e Brigadeiros", type: "product" as const, color: "#db2777" },
    { name: "Sobremesas", type: "product" as const, color: "#be185d" },
    { name: "Sorvetes e Açaí", type: "product" as const, color: "#a855f7" },

    // Bebidas
    { name: "Bebidas Quentes", type: "product" as const, color: "#78350f" },
    { name: "Bebidas Geladas", type: "product" as const, color: "#0ea5e9" },
    { name: "Sucos e Vitaminas", type: "product" as const, color: "#f97316" },
    { name: "Drinks e Coquetéis", type: "product" as const, color: "#7c3aed" },

    // Outros
    { name: "Menu Kids", type: "product" as const, color: "#fde047" },
    { name: "Combos", type: "product" as const, color: "#8b5cf6" },
    { name: "Promoções", type: "product" as const, color: "#10b981" },
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
