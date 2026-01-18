"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq, and, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  workspace,
  workspaceMember,
  menu,
  menuProduct,
  menuFee,
  fixedCost,
  product,
  productComposition,
  recipe,
  recipeItem,
  recipeStep,
  ingredient,
  ingredientVariation,
  entry,
  sizeGroup,
  sizeOption,
  supplier,
  category,
  unit,
} from "@/lib/db/schema";
import { requireSession } from "@/lib/session";
import { generateId, generateSlug } from "@/lib/utils/id";
import { seedStandardUnits } from "./units";
import { seedStandardCategories } from "./categories";

export type EstablishmentType = "pizzeria" | "burger_shop" | "bar" | "bakery" | "restaurant" | "other";

export async function createWorkspace(formData: FormData) {
  const session = await requireSession();

  const name = formData.get("name") as string;
  const description = formData.get("description") as string | null;
  const establishmentType = (formData.get("establishmentType") as EstablishmentType) || "other";

  if (!name || name.trim().length === 0) {
    return { error: "Nome é obrigatório" };
  }

  const id = generateId("ws");
  let slug = generateSlug(name);

  // Check if slug exists and append number if needed
  const existingSlugs = await db
    .select({ slug: workspace.slug })
    .from(workspace)
    .where(eq(workspace.slug, slug));

  if (existingSlugs.length > 0) {
    slug = `${slug}-${Date.now()}`;
  }

  await db.insert(workspace).values({
    id,
    name: name.trim(),
    slug,
    description: description?.trim() || null,
    establishmentType,
  });

  await db.insert(workspaceMember).values({
    workspaceId: id,
    userId: session.user.id,
    role: "owner",
  });

  // Seed standard units and categories for new workspace
  await seedStandardUnits(id);
  await seedStandardCategories(id, establishmentType);

  revalidatePath("/");
  redirect(`/${slug}`);
}

export async function getUserWorkspaces() {
  const session = await requireSession();

  const workspaces = await db
    .select({
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      description: workspace.description,
      role: workspaceMember.role,
    })
    .from(workspaceMember)
    .innerJoin(workspace, eq(workspaceMember.workspaceId, workspace.id))
    .where(eq(workspaceMember.userId, session.user.id));

  return workspaces;
}

export async function getWorkspaceBySlug(slug: string) {
  const session = await requireSession();

  const result = await db
    .select({
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      description: workspace.description,
      laborCostPerHour: workspace.laborCostPerHour,
      monthlyWorkHours: workspace.monthlyWorkHours,
      role: workspaceMember.role,
    })
    .from(workspace)
    .innerJoin(workspaceMember, eq(workspace.id, workspaceMember.workspaceId))
    .where(
      and(
        eq(workspace.slug, slug),
        eq(workspaceMember.userId, session.user.id)
      )
    );

  return result[0] || null;
}

export async function updateWorkspace(
  workspaceId: string,
  formData: FormData
) {
  const session = await requireSession();

  // Check if user is owner or admin
  const member = await db
    .select()
    .from(workspaceMember)
    .where(
      and(
        eq(workspaceMember.workspaceId, workspaceId),
        eq(workspaceMember.userId, session.user.id)
      )
    );

  if (!member[0] || !["owner", "admin"].includes(member[0].role)) {
    return { error: "Sem permissão para editar" };
  }

  const name = formData.get("name") as string;
  const description = formData.get("description") as string | null;

  if (!name || name.trim().length === 0) {
    return { error: "Nome é obrigatório" };
  }

  await db
    .update(workspace)
    .set({
      name: name.trim(),
      description: description?.trim() || null,
      updatedAt: new Date(),
    })
    .where(eq(workspace.id, workspaceId));

  revalidatePath("/");
  return { success: true };
}

export async function updateLaborCost(
  workspaceSlug: string,
  laborCostPerHour: string | null,
  monthlyWorkHours: string | null
) {
  const session = await requireSession();

  // Get workspace
  const [workspaceData] = await db
    .select({ id: workspace.id })
    .from(workspace)
    .innerJoin(workspaceMember, eq(workspace.id, workspaceMember.workspaceId))
    .where(
      and(
        eq(workspace.slug, workspaceSlug),
        eq(workspaceMember.userId, session.user.id)
      )
    );

  if (!workspaceData) {
    return { error: "Workspace não encontrado" };
  }

  await db
    .update(workspace)
    .set({
      laborCostPerHour: laborCostPerHour || null,
      monthlyWorkHours: monthlyWorkHours || null,
      updatedAt: new Date(),
    })
    .where(eq(workspace.id, workspaceData.id));

  revalidatePath(`/${workspaceSlug}`);
  return { success: true, workspaceId: workspaceData.id };
}

export async function deleteWorkspace(workspaceId: string, confirmationName: string) {
  const session = await requireSession();

  // Get workspace info
  const [workspaceData] = await db
    .select({
      id: workspace.id,
      name: workspace.name,
    })
    .from(workspace)
    .where(eq(workspace.id, workspaceId));

  if (!workspaceData) {
    return { error: "Workspace não encontrado" };
  }

  // Check if user is owner
  const [member] = await db
    .select()
    .from(workspaceMember)
    .where(
      and(
        eq(workspaceMember.workspaceId, workspaceId),
        eq(workspaceMember.userId, session.user.id)
      )
    );

  if (!member || member.role !== "owner") {
    return { error: "Apenas o proprietário pode excluir o negócio" };
  }

  // Verify confirmation name matches
  if (confirmationName !== workspaceData.name) {
    return { error: "Nome de confirmação não confere" };
  }

  // Delete all related data in correct order (children first)
  // This is needed because CASCADE might not be set on all constraints in the database

  // 1. Get all menus for this workspace
  const menus = await db.select({ id: menu.id }).from(menu).where(eq(menu.workspaceId, workspaceId));
  const menuIds = menus.map((m) => m.id);

  if (menuIds.length > 0) {
    // Delete menu products and fees
    await db.delete(menuProduct).where(inArray(menuProduct.menuId, menuIds));
    await db.delete(menuFee).where(inArray(menuFee.menuId, menuIds));
  }

  // 2. Delete menus
  await db.delete(menu).where(eq(menu.workspaceId, workspaceId));

  // 3. Get all products for this workspace
  const products = await db.select({ id: product.id }).from(product).where(eq(product.workspaceId, workspaceId));
  const productIds = products.map((p) => p.id);

  if (productIds.length > 0) {
    // Delete product compositions
    await db.delete(productComposition).where(inArray(productComposition.productId, productIds));
  }

  // 4. Delete products
  await db.delete(product).where(eq(product.workspaceId, workspaceId));

  // 5. Get all recipes for this workspace
  const recipes = await db.select({ id: recipe.id }).from(recipe).where(eq(recipe.workspaceId, workspaceId));
  const recipeIds = recipes.map((r) => r.id);

  if (recipeIds.length > 0) {
    // Delete recipe items and steps
    await db.delete(recipeItem).where(inArray(recipeItem.recipeId, recipeIds));
    await db.delete(recipeStep).where(inArray(recipeStep.recipeId, recipeIds));
  }

  // 6. Delete recipes
  await db.delete(recipe).where(eq(recipe.workspaceId, workspaceId));

  // 7. Get all ingredients for this workspace
  const ingredients = await db.select({ id: ingredient.id }).from(ingredient).where(eq(ingredient.workspaceId, workspaceId));
  const ingredientIds = ingredients.map((i) => i.id);

  if (ingredientIds.length > 0) {
    // Delete variations and entries
    await db.delete(ingredientVariation).where(inArray(ingredientVariation.ingredientId, ingredientIds));
    await db.delete(entry).where(inArray(entry.ingredientId, ingredientIds));
  }

  // 8. Delete ingredients
  await db.delete(ingredient).where(eq(ingredient.workspaceId, workspaceId));

  // 9. Get all size groups and delete options first
  const sizeGroups = await db.select({ id: sizeGroup.id }).from(sizeGroup).where(eq(sizeGroup.workspaceId, workspaceId));
  const sizeGroupIds = sizeGroups.map((s) => s.id);

  if (sizeGroupIds.length > 0) {
    await db.delete(sizeOption).where(inArray(sizeOption.sizeGroupId, sizeGroupIds));
  }

  // 10. Delete size groups
  await db.delete(sizeGroup).where(eq(sizeGroup.workspaceId, workspaceId));

  // 11. Delete fixed costs, suppliers, categories, units
  await db.delete(fixedCost).where(eq(fixedCost.workspaceId, workspaceId));
  await db.delete(supplier).where(eq(supplier.workspaceId, workspaceId));
  await db.delete(category).where(eq(category.workspaceId, workspaceId));
  await db.delete(unit).where(eq(unit.workspaceId, workspaceId));

  // 12. Delete workspace members
  await db.delete(workspaceMember).where(eq(workspaceMember.workspaceId, workspaceId));

  // 13. Finally delete the workspace
  await db.delete(workspace).where(eq(workspace.id, workspaceId));

  revalidatePath("/");
  redirect("/");
}
