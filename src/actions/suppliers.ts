"use server";

import { revalidatePath } from "next/cache";
import { eq, and, ilike, count } from "drizzle-orm";
import { db } from "@/lib/db";
import { supplier } from "@/lib/db/schema";
import { requireSession } from "@/lib/session";
import { getWorkspaceBySlug } from "./workspace";
import { generateId } from "@/lib/utils/id";

export interface SuppliersFilters {
  search?: string;
  page?: number;
  perPage?: number;
}

export async function getSuppliers(workspaceSlug: string, filters: SuppliersFilters = {}) {
  await requireSession();
  const workspace = await getWorkspaceBySlug(workspaceSlug);

  if (!workspace) {
    throw new Error("Workspace not found");
  }

  const { search, page = 1, perPage = 15 } = filters;
  const offset = (page - 1) * perPage;

  const conditions = [eq(supplier.workspaceId, workspace.id)];

  if (search) {
    conditions.push(ilike(supplier.name, `%${search}%`));
  }

  const whereClause = and(...conditions);

  const [suppliers, totalResult] = await Promise.all([
    db
      .select()
      .from(supplier)
      .where(whereClause)
      .orderBy(supplier.name)
      .limit(perPage)
      .offset(offset),
    db.select({ count: count() }).from(supplier).where(whereClause),
  ]);

  const total = totalResult[0]?.count ?? 0;

  return {
    suppliers,
    pagination: {
      page,
      perPage,
      total,
      totalPages: Math.ceil(total / perPage),
    },
  };
}

// Simple list for dropdowns (no pagination)
export async function getSuppliersList(workspaceSlug: string) {
  await requireSession();
  const workspace = await getWorkspaceBySlug(workspaceSlug);

  if (!workspace) {
    throw new Error("Workspace not found");
  }

  const suppliers = await db
    .select()
    .from(supplier)
    .where(eq(supplier.workspaceId, workspace.id))
    .orderBy(supplier.name);

  return suppliers;
}

export async function getSupplier(workspaceSlug: string, supplierId: string) {
  await requireSession();
  const workspace = await getWorkspaceBySlug(workspaceSlug);

  if (!workspace) {
    throw new Error("Workspace not found");
  }

  const result = await db
    .select()
    .from(supplier)
    .where(and(eq(supplier.id, supplierId), eq(supplier.workspaceId, workspace.id)));

  return result[0] || null;
}

export async function createSupplier(workspaceSlug: string, formData: FormData) {
  await requireSession();
  const workspace = await getWorkspaceBySlug(workspaceSlug);

  if (!workspace) {
    return { error: "Workspace não encontrado" };
  }

  const name = formData.get("name") as string;
  const phone = formData.get("phone") as string | null;
  const email = formData.get("email") as string | null;
  const address = formData.get("address") as string | null;
  const notes = formData.get("notes") as string | null;

  if (!name) {
    return { error: "Nome é obrigatório" };
  }

  const id = generateId("sup");

  await db.insert(supplier).values({
    id,
    workspaceId: workspace.id,
    name: name.trim(),
    phone: phone?.trim() || null,
    email: email?.trim() || null,
    address: address?.trim() || null,
    notes: notes?.trim() || null,
  });

  revalidatePath(`/${workspaceSlug}`);
  return { success: true, id };
}

// Quick create supplier (just name) - for inline creation in forms
export async function quickCreateSupplier(workspaceSlug: string, name: string) {
  await requireSession();
  const workspace = await getWorkspaceBySlug(workspaceSlug);

  if (!workspace) {
    return { error: "Workspace não encontrado" };
  }

  if (!name || !name.trim()) {
    return { error: "Nome é obrigatório" };
  }

  const id = generateId("sup");

  await db.insert(supplier).values({
    id,
    workspaceId: workspace.id,
    name: name.trim(),
  });

  return { success: true, id, name: name.trim() };
}

export async function updateSupplier(
  workspaceSlug: string,
  supplierId: string,
  formData: FormData
) {
  await requireSession();
  const workspace = await getWorkspaceBySlug(workspaceSlug);

  if (!workspace) {
    return { error: "Workspace não encontrado" };
  }

  const name = formData.get("name") as string;
  const phone = formData.get("phone") as string | null;
  const email = formData.get("email") as string | null;
  const address = formData.get("address") as string | null;
  const notes = formData.get("notes") as string | null;

  if (!name) {
    return { error: "Nome é obrigatório" };
  }

  await db
    .update(supplier)
    .set({
      name: name.trim(),
      phone: phone?.trim() || null,
      email: email?.trim() || null,
      address: address?.trim() || null,
      notes: notes?.trim() || null,
      updatedAt: new Date(),
    })
    .where(and(eq(supplier.id, supplierId), eq(supplier.workspaceId, workspace.id)));

  revalidatePath(`/${workspaceSlug}`);
  return { success: true };
}

export async function deleteSupplier(workspaceSlug: string, supplierId: string) {
  await requireSession();
  const workspace = await getWorkspaceBySlug(workspaceSlug);

  if (!workspace) {
    return { error: "Workspace não encontrado" };
  }

  // TODO: Check if supplier is in use before deleting

  await db
    .delete(supplier)
    .where(and(eq(supplier.id, supplierId), eq(supplier.workspaceId, workspace.id)));

  revalidatePath(`/${workspaceSlug}`);
  return { success: true };
}
