import { pgTable, text, timestamp, pgEnum, decimal } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { workspace } from "./workspace";

export const unitTypeEnum = pgEnum("unit_type", ["standard", "custom"]);

export const unit = pgTable("unit", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspace.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  abbreviation: text("abbreviation").notNull(),
  type: unitTypeEnum("type").notNull().default("custom"),
  baseUnitId: text("base_unit_id").references((): ReturnType<typeof text> => unit.id),
  conversionFactor: decimal("conversion_factor", { precision: 15, scale: 6 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const unitRelations = relations(unit, ({ one }) => ({
  workspace: one(workspace, {
    fields: [unit.workspaceId],
    references: [workspace.id],
  }),
  baseUnit: one(unit, {
    fields: [unit.baseUnitId],
    references: [unit.id],
  }),
}));
