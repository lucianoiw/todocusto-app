"use server";

import { revalidatePath } from "next/cache";
import { eq, and, ilike } from "drizzle-orm";
import { db } from "@/lib/db";
import { unit } from "@/lib/db/schema";
import { requireSession } from "@/lib/session";
import { getWorkspaceBySlug } from "./workspace";
import { generateId } from "@/lib/utils/id";

export type MeasurementType = "weight" | "volume" | "unit";

export interface UnitsFilters {
  search?: string;
  measurementType?: MeasurementType;
}

export async function getUnits(workspaceSlug: string, filters?: UnitsFilters) {
  await requireSession();
  const workspace = await getWorkspaceBySlug(workspaceSlug);

  if (!workspace) {
    throw new Error("Workspace not found");
  }

  // Build conditions
  const conditions = [eq(unit.workspaceId, workspace.id)];

  if (filters?.search) {
    conditions.push(ilike(unit.name, `%${filters.search}%`));
  }

  if (filters?.measurementType) {
    conditions.push(eq(unit.measurementType, filters.measurementType));
  }

  const units = await db
    .select()
    .from(unit)
    .where(and(...conditions))
    .orderBy(unit.measurementType, unit.name);

  // Group by measurement type
  const weightUnits = units.filter((u) => u.measurementType === "weight");
  const volumeUnits = units.filter((u) => u.measurementType === "volume");
  const unitUnits = units.filter((u) => u.measurementType === "unit");

  return {
    all: units,
    weight: weightUnits,
    volume: volumeUnits,
    unit: unitUnits,
  };
}

export async function getUnitsByType(workspaceSlug: string, measurementType: "weight" | "volume" | "unit") {
  await requireSession();
  const workspace = await getWorkspaceBySlug(workspaceSlug);

  if (!workspace) {
    throw new Error("Workspace not found");
  }

  const units = await db
    .select()
    .from(unit)
    .where(and(
      eq(unit.workspaceId, workspace.id),
      eq(unit.measurementType, measurementType)
    ))
    .orderBy(unit.name);

  return units;
}

export async function getUnit(workspaceSlug: string, unitId: string) {
  await requireSession();
  const workspace = await getWorkspaceBySlug(workspaceSlug);

  if (!workspace) {
    throw new Error("Workspace not found");
  }

  const result = await db
    .select()
    .from(unit)
    .where(and(eq(unit.id, unitId), eq(unit.workspaceId, workspace.id)));

  return result[0] || null;
}

export async function createUnit(workspaceSlug: string, formData: FormData) {
  await requireSession();
  const workspace = await getWorkspaceBySlug(workspaceSlug);

  if (!workspace) {
    return { error: "Workspace não encontrado" };
  }

  const name = formData.get("name") as string;
  const abbreviation = formData.get("abbreviation") as string;
  const measurementType = formData.get("measurementType") as "weight" | "volume" | "unit";
  const conversionFactor = formData.get("conversionFactor") as string;

  if (!name || !abbreviation || !measurementType || !conversionFactor) {
    return { error: "Todos os campos são obrigatórios" };
  }

  const id = generateId("unit");

  await db.insert(unit).values({
    id,
    workspaceId: workspace.id,
    name: name.trim(),
    abbreviation: abbreviation.trim(),
    measurementType,
    conversionFactor,
    isBase: false,
  });

  revalidatePath(`/${workspaceSlug}/units`);
  return { success: true, id };
}

export async function updateUnit(
  workspaceSlug: string,
  unitId: string,
  formData: FormData
) {
  await requireSession();
  const workspace = await getWorkspaceBySlug(workspaceSlug);

  if (!workspace) {
    return { error: "Workspace não encontrado" };
  }

  const existingUnit = await getUnit(workspaceSlug, unitId);
  if (!existingUnit) {
    return { error: "Unidade não encontrada" };
  }

  if (existingUnit.isBase) {
    return { error: "Unidades base não podem ser editadas" };
  }

  const name = formData.get("name") as string;
  const abbreviation = formData.get("abbreviation") as string;
  const conversionFactor = formData.get("conversionFactor") as string;

  if (!name || !abbreviation || !conversionFactor) {
    return { error: "Todos os campos são obrigatórios" };
  }

  await db
    .update(unit)
    .set({
      name: name.trim(),
      abbreviation: abbreviation.trim(),
      conversionFactor,
      updatedAt: new Date(),
    })
    .where(and(eq(unit.id, unitId), eq(unit.workspaceId, workspace.id)));

  revalidatePath(`/${workspaceSlug}/units`);
  return { success: true };
}

export async function deleteUnit(workspaceSlug: string, unitId: string) {
  await requireSession();
  const workspace = await getWorkspaceBySlug(workspaceSlug);

  if (!workspace) {
    return { error: "Workspace não encontrado" };
  }

  const existingUnit = await getUnit(workspaceSlug, unitId);
  if (!existingUnit) {
    return { error: "Unidade não encontrada" };
  }

  if (existingUnit.isBase) {
    return { error: "Unidades base não podem ser excluídas" };
  }

  // TODO: Check if unit is in use before deleting

  await db
    .delete(unit)
    .where(and(eq(unit.id, unitId), eq(unit.workspaceId, workspace.id)));

  revalidatePath(`/${workspaceSlug}/units`);
  return { success: true };
}

export async function seedStandardUnits(workspaceId: string) {
  const standardUnits = [
    // Peso (base: grama)
    { name: "Grama", abbreviation: "g", measurementType: "weight" as const, conversionFactor: "1", isBase: true },
    { name: "Quilograma", abbreviation: "kg", measurementType: "weight" as const, conversionFactor: "1000", isBase: false },
    { name: "Miligrama", abbreviation: "mg", measurementType: "weight" as const, conversionFactor: "0.001", isBase: false },
    // Volume (base: mililitro)
    { name: "Mililitro", abbreviation: "ml", measurementType: "volume" as const, conversionFactor: "1", isBase: true },
    { name: "Litro", abbreviation: "L", measurementType: "volume" as const, conversionFactor: "1000", isBase: false },
    // Unidade (base: unidade)
    { name: "Unidade", abbreviation: "un", measurementType: "unit" as const, conversionFactor: "1", isBase: true },
    { name: "Dúzia", abbreviation: "dz", measurementType: "unit" as const, conversionFactor: "12", isBase: false },
  ];

  for (const u of standardUnits) {
    await db.insert(unit).values({
      id: generateId("unit"),
      workspaceId,
      name: u.name,
      abbreviation: u.abbreviation,
      measurementType: u.measurementType,
      conversionFactor: u.conversionFactor,
      isBase: u.isBase,
    });
  }
}
