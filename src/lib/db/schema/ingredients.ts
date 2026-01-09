import {
  pgTable,
  text,
  timestamp,
  decimal,
  boolean,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { workspace } from "./workspace";
import { category } from "./categories";
import { unit } from "./units";

export const ingredient = pgTable("ingredient", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspace.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  categoryId: text("category_id").references(() => category.id, {
    onDelete: "set null",
  }),
  baseUnitId: text("base_unit_id")
    .notNull()
    .references(() => unit.id),
  averagePrice: decimal("average_price", { precision: 15, scale: 4 })
    .notNull()
    .default("0"),
  averagePriceManual: boolean("average_price_manual").notNull().default(false),
  hasVariations: boolean("has_variations").notNull().default(false),
  tags: text("tags").array(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const ingredientVariation = pgTable("ingredient_variation", {
  id: text("id").primaryKey(),
  ingredientId: text("ingredient_id")
    .notNull()
    .references(() => ingredient.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  yieldPercentage: decimal("yield_percentage", { precision: 5, scale: 2 }).notNull(),
  unitId: text("unit_id")
    .notNull()
    .references(() => unit.id),
  equivalenceQuantity: decimal("equivalence_quantity", {
    precision: 15,
    scale: 6,
  }).notNull(),
  calculatedCost: decimal("calculated_cost", { precision: 15, scale: 4 })
    .notNull()
    .default("0"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const ingredientRelations = relations(ingredient, ({ one, many }) => ({
  workspace: one(workspace, {
    fields: [ingredient.workspaceId],
    references: [workspace.id],
  }),
  category: one(category, {
    fields: [ingredient.categoryId],
    references: [category.id],
  }),
  baseUnit: one(unit, {
    fields: [ingredient.baseUnitId],
    references: [unit.id],
  }),
  variations: many(ingredientVariation),
}));

export const ingredientVariationRelations = relations(
  ingredientVariation,
  ({ one }) => ({
    ingredient: one(ingredient, {
      fields: [ingredientVariation.ingredientId],
      references: [ingredient.id],
    }),
    unit: one(unit, {
      fields: [ingredientVariation.unitId],
      references: [unit.id],
    }),
  })
);
