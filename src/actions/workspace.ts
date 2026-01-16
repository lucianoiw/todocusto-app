"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { workspace, workspaceMember } from "@/lib/db/schema";
import { requireSession } from "@/lib/session";
import { generateId, generateSlug } from "@/lib/utils/id";
import { seedStandardUnits } from "./units";
import { seedStandardCategories } from "./categories";

export async function createWorkspace(formData: FormData) {
  const session = await requireSession();

  const name = formData.get("name") as string;
  const description = formData.get("description") as string | null;

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
  });

  await db.insert(workspaceMember).values({
    workspaceId: id,
    userId: session.user.id,
    role: "owner",
  });

  // Seed standard units and categories for new workspace
  await seedStandardUnits(id);
  await seedStandardCategories(id);

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
