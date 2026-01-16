import { pgTable, text, timestamp, pgEnum, decimal, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { workspace } from "./workspace";

// Tipo de medida: peso, volume ou unidade
export const measurementTypeEnum = pgEnum("measurement_type", ["weight", "volume", "unit"]);

export const unit = pgTable("unit", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspace.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  abbreviation: text("abbreviation").notNull(),
  measurementType: measurementTypeEnum("measurement_type").notNull(),
  // Fator de conversão para a unidade base do tipo (g, ml, un)
  // Ex: kg = 1000 (1kg = 1000g), L = 1000 (1L = 1000ml)
  conversionFactor: decimal("conversion_factor", { precision: 15, scale: 6 }).notNull().default("1"),
  // Indica se é a unidade base do tipo (g para peso, ml para volume, un para unidade)
  isBase: boolean("is_base").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const unitRelations = relations(unit, ({ one }) => ({
  workspace: one(workspace, {
    fields: [unit.workspaceId],
    references: [workspace.id],
  }),
}));
