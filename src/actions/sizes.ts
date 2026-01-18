"use server";

import { revalidatePath } from "next/cache";
import { eq, and, asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { sizeGroup, sizeOption } from "@/lib/db/schema";
import { requireSession } from "@/lib/session";
import { getWorkspaceBySlug } from "./workspace";
import { generateId } from "@/lib/utils/id";

export interface SizeOptionInput {
  name: string;
  multiplier: string;
  isReference: boolean;
}

// ==================== SIZE GROUPS ====================

export async function getSizeGroups(workspaceSlug: string) {
  await requireSession();
  const workspace = await getWorkspaceBySlug(workspaceSlug);

  if (!workspace) {
    throw new Error("Workspace not found");
  }

  const groups = await db
    .select()
    .from(sizeGroup)
    .where(eq(sizeGroup.workspaceId, workspace.id))
    .orderBy(sizeGroup.name);

  // Get options for each group
  const groupsWithOptions = await Promise.all(
    groups.map(async (group) => {
      const options = await db
        .select()
        .from(sizeOption)
        .where(eq(sizeOption.sizeGroupId, group.id))
        .orderBy(asc(sizeOption.sortOrder), asc(sizeOption.name));

      return {
        ...group,
        options,
      };
    })
  );

  return groupsWithOptions;
}

export async function getSizeGroup(workspaceSlug: string, sizeGroupId: string) {
  await requireSession();
  const workspace = await getWorkspaceBySlug(workspaceSlug);

  if (!workspace) {
    throw new Error("Workspace not found");
  }

  const result = await db
    .select()
    .from(sizeGroup)
    .where(
      and(eq(sizeGroup.id, sizeGroupId), eq(sizeGroup.workspaceId, workspace.id))
    );

  if (!result[0]) {
    return null;
  }

  const options = await db
    .select()
    .from(sizeOption)
    .where(eq(sizeOption.sizeGroupId, sizeGroupId))
    .orderBy(asc(sizeOption.sortOrder), asc(sizeOption.name));

  return {
    ...result[0],
    options,
  };
}

export async function createSizeGroup(
  workspaceSlug: string,
  formData: FormData
) {
  await requireSession();
  const workspace = await getWorkspaceBySlug(workspaceSlug);

  if (!workspace) {
    return { error: "Workspace not found" };
  }

  const name = formData.get("name") as string;
  const description = formData.get("description") as string | null;
  const optionsJson = formData.get("options") as string;

  if (!name) {
    return { error: "Nome is required" };
  }

  let options: SizeOptionInput[] = [];
  try {
    options = JSON.parse(optionsJson || "[]");
  } catch {
    return { error: "Invalid options format" };
  }

  if (options.length === 0) {
    return { error: "At least one size option is required" };
  }

  // Validate that exactly one option is reference
  const referenceCount = options.filter((o) => o.isReference).length;
  if (referenceCount !== 1) {
    return { error: "Exactly one option must be marked as reference" };
  }

  const groupId = generateId("szg");

  await db.insert(sizeGroup).values({
    id: groupId,
    workspaceId: workspace.id,
    name: name.trim(),
    description: description?.trim() || null,
  });

  // Insert options
  for (let i = 0; i < options.length; i++) {
    const opt = options[i];
    await db.insert(sizeOption).values({
      id: generateId("szo"),
      sizeGroupId: groupId,
      name: opt.name.trim(),
      multiplier: opt.multiplier,
      isReference: opt.isReference,
      sortOrder: i,
    });
  }

  revalidatePath(`/${workspaceSlug}/sizes`);
  return { success: true, id: groupId };
}

export async function updateSizeGroup(
  workspaceSlug: string,
  sizeGroupId: string,
  formData: FormData
) {
  await requireSession();
  const workspace = await getWorkspaceBySlug(workspaceSlug);

  if (!workspace) {
    return { error: "Workspace not found" };
  }

  const name = formData.get("name") as string;
  const description = formData.get("description") as string | null;
  const optionsJson = formData.get("options") as string;

  if (!name) {
    return { error: "Nome is required" };
  }

  let options: (SizeOptionInput & { id?: string })[] = [];
  try {
    options = JSON.parse(optionsJson || "[]");
  } catch {
    return { error: "Invalid options format" };
  }

  if (options.length === 0) {
    return { error: "At least one size option is required" };
  }

  // Validate that exactly one option is reference
  const referenceCount = options.filter((o) => o.isReference).length;
  if (referenceCount !== 1) {
    return { error: "Exactly one option must be marked as reference" };
  }

  // Update group
  await db
    .update(sizeGroup)
    .set({
      name: name.trim(),
      description: description?.trim() || null,
      updatedAt: new Date(),
    })
    .where(
      and(eq(sizeGroup.id, sizeGroupId), eq(sizeGroup.workspaceId, workspace.id))
    );

  // Delete existing options and recreate
  await db.delete(sizeOption).where(eq(sizeOption.sizeGroupId, sizeGroupId));

  // Insert new options
  for (let i = 0; i < options.length; i++) {
    const opt = options[i];
    await db.insert(sizeOption).values({
      id: generateId("szo"),
      sizeGroupId: sizeGroupId,
      name: opt.name.trim(),
      multiplier: opt.multiplier,
      isReference: opt.isReference,
      sortOrder: i,
    });
  }

  revalidatePath(`/${workspaceSlug}/sizes`);
  revalidatePath(`/${workspaceSlug}/sizes/${sizeGroupId}`);
  return { success: true };
}

export async function deleteSizeGroup(
  workspaceSlug: string,
  sizeGroupId: string
) {
  await requireSession();
  const workspace = await getWorkspaceBySlug(workspaceSlug);

  if (!workspace) {
    return { error: "Workspace not found" };
  }

  // TODO: Check if group is in use by products before deleting

  await db
    .delete(sizeGroup)
    .where(
      and(eq(sizeGroup.id, sizeGroupId), eq(sizeGroup.workspaceId, workspace.id))
    );

  revalidatePath(`/${workspaceSlug}/sizes`);
  return { success: true };
}

// ==================== SIZE OPTIONS ====================

export async function getSizeOptions(sizeGroupId: string) {
  await requireSession();

  const options = await db
    .select()
    .from(sizeOption)
    .where(eq(sizeOption.sizeGroupId, sizeGroupId))
    .orderBy(asc(sizeOption.sortOrder), asc(sizeOption.name));

  return options;
}

export async function getSizeOptionsByGroupId(sizeGroupId: string) {
  await requireSession();

  const options = await db
    .select()
    .from(sizeOption)
    .where(eq(sizeOption.sizeGroupId, sizeGroupId))
    .orderBy(asc(sizeOption.sortOrder), asc(sizeOption.name));

  return options;
}
