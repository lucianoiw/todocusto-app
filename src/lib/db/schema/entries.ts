import { pgTable, text, timestamp, decimal, date } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { ingredient } from "./ingredients";
import { unit } from "./units";
import { supplier } from "./suppliers";

export const entry = pgTable("entry", {
  id: text("id").primaryKey(),
  ingredientId: text("ingredient_id")
    .notNull()
    .references(() => ingredient.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  quantity: decimal("quantity", { precision: 15, scale: 4 }).notNull(),
  unitId: text("unit_id")
    .notNull()
    .references(() => unit.id),
  unitPrice: decimal("unit_price", { precision: 15, scale: 4 }).notNull(),
  totalPrice: decimal("total_price", { precision: 15, scale: 4 }).notNull(),
  supplierId: text("supplier_id").references(() => supplier.id, {
    onDelete: "set null",
  }),
  observation: text("observation"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const entryRelations = relations(entry, ({ one }) => ({
  ingredient: one(ingredient, {
    fields: [entry.ingredientId],
    references: [ingredient.id],
  }),
  unit: one(unit, {
    fields: [entry.unitId],
    references: [unit.id],
  }),
  supplier: one(supplier, {
    fields: [entry.supplierId],
    references: [supplier.id],
  }),
}));
