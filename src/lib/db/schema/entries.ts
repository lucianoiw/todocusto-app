import { pgTable, text, timestamp, decimal, date } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { ingredient } from "./ingredients";

export const entry = pgTable("entry", {
  id: text("id").primaryKey(),
  ingredientId: text("ingredient_id")
    .notNull()
    .references(() => ingredient.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  quantity: decimal("quantity", { precision: 15, scale: 4 }).notNull(),
  unitPrice: decimal("unit_price", { precision: 15, scale: 4 }).notNull(),
  totalPrice: decimal("total_price", { precision: 15, scale: 4 }).notNull(),
  supplier: text("supplier"),
  observation: text("observation"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const entryRelations = relations(entry, ({ one }) => ({
  ingredient: one(ingredient, {
    fields: [entry.ingredientId],
    references: [ingredient.id],
  }),
}));
