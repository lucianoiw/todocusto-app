"use server";

import { revalidatePath } from "next/cache";
import { eq, and, ilike, count } from "drizzle-orm";
import { db } from "@/lib/db";
import { fixedCost } from "@/lib/db/schema";
import { requireSession } from "@/lib/session";
import { getWorkspaceBySlug } from "./workspace";
import { generateId } from "@/lib/utils/id";

export interface FixedCostsFilters {
  search?: string;
  status?: "active" | "inactive";
  page?: number;
  perPage?: number;
}

export async function getFixedCosts(workspaceSlug: string, filters?: FixedCostsFilters) {
  await requireSession();
  const workspace = await getWorkspaceBySlug(workspaceSlug);

  if (!workspace) {
    throw new Error("Workspace not found");
  }

  const page = filters?.page || 1;
  const perPage = filters?.perPage || 15;
  const offset = (page - 1) * perPage;

  // Build conditions
  const conditions = [eq(fixedCost.workspaceId, workspace.id)];

  if (filters?.search) {
    conditions.push(ilike(fixedCost.name, `%${filters.search}%`));
  }

  if (filters?.status === "active") {
    conditions.push(eq(fixedCost.active, true));
  } else if (filters?.status === "inactive") {
    conditions.push(eq(fixedCost.active, false));
  }

  const whereClause = and(...conditions);

  // Get total count
  const totalResult = await db
    .select({ count: count() })
    .from(fixedCost)
    .where(whereClause);

  const total = totalResult[0]?.count || 0;

  const costs = await db
    .select({
      id: fixedCost.id,
      name: fixedCost.name,
      description: fixedCost.description,
      value: fixedCost.value,
      active: fixedCost.active,
      createdAt: fixedCost.createdAt,
    })
    .from(fixedCost)
    .where(whereClause)
    .orderBy(fixedCost.name)
    .limit(perPage)
    .offset(offset);

  // Calculate total active
  const activeTotal = costs
    .filter((c) => c.active)
    .reduce((sum, c) => sum + parseFloat(c.value), 0);

  return {
    costs,
    activeTotal,
    pagination: {
      page,
      perPage,
      total,
      totalPages: Math.ceil(total / perPage),
    },
  };
}

export async function getFixedCost(workspaceSlug: string, fixedCostId: string) {
  await requireSession();
  const workspace = await getWorkspaceBySlug(workspaceSlug);

  if (!workspace) {
    throw new Error("Workspace not found");
  }

  const result = await db
    .select({
      id: fixedCost.id,
      name: fixedCost.name,
      description: fixedCost.description,
      value: fixedCost.value,
      active: fixedCost.active,
      createdAt: fixedCost.createdAt,
      updatedAt: fixedCost.updatedAt,
    })
    .from(fixedCost)
    .where(and(eq(fixedCost.id, fixedCostId), eq(fixedCost.workspaceId, workspace.id)));

  return result[0] || null;
}

export async function createFixedCost(workspaceSlug: string, formData: FormData) {
  await requireSession();
  const workspace = await getWorkspaceBySlug(workspaceSlug);

  if (!workspace) {
    return { error: "Workspace não encontrado" };
  }

  const name = formData.get("name") as string;
  const description = formData.get("description") as string | null;
  const value = formData.get("value") as string;
  const active = formData.get("active") !== "false";

  if (!name || !value) {
    return { error: "Nome e valor são obrigatórios" };
  }

  const id = generateId("fc");

  await db.insert(fixedCost).values({
    id,
    workspaceId: workspace.id,
    name: name.trim(),
    description: description?.trim() || null,
    value,
    active,
  });

  revalidatePath(`/${workspaceSlug}/fixed-costs`);
  return { success: true, id };
}

export async function updateFixedCost(
  workspaceSlug: string,
  fixedCostId: string,
  formData: FormData
) {
  await requireSession();
  const workspace = await getWorkspaceBySlug(workspaceSlug);

  if (!workspace) {
    return { error: "Workspace não encontrado" };
  }

  const name = formData.get("name") as string;
  const description = formData.get("description") as string | null;
  const value = formData.get("value") as string;
  const active = formData.get("active") !== "false";

  if (!name || !value) {
    return { error: "Nome e valor são obrigatórios" };
  }

  await db
    .update(fixedCost)
    .set({
      name: name.trim(),
      description: description?.trim() || null,
      value,
      active,
      updatedAt: new Date(),
    })
    .where(and(eq(fixedCost.id, fixedCostId), eq(fixedCost.workspaceId, workspace.id)));

  revalidatePath(`/${workspaceSlug}/fixed-costs`);
  return { success: true };
}

export async function deleteFixedCost(workspaceSlug: string, fixedCostId: string) {
  await requireSession();
  const workspace = await getWorkspaceBySlug(workspaceSlug);

  if (!workspace) {
    return { error: "Workspace não encontrado" };
  }

  await db
    .delete(fixedCost)
    .where(and(eq(fixedCost.id, fixedCostId), eq(fixedCost.workspaceId, workspace.id)));

  revalidatePath(`/${workspaceSlug}/fixed-costs`);
  return { success: true };
}
