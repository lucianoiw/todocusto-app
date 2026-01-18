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
import { unit, measurementTypeEnum } from "./units";

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
  // Tipo de medida: peso (weight), líquido (volume) ou unidade (unit)
  measurementType: measurementTypeEnum("measurement_type").notNull(),
  // Unidade usada para o preço (ex: kg, L, un)
  priceUnitId: text("price_unit_id")
    .notNull()
    .references(() => unit.id),
  // Preço por priceUnit (ex: R$50/kg)
  averagePrice: decimal("average_price", { precision: 15, scale: 4 })
    .notNull()
    .default("0"),
  // Custo calculado por unidade base (g, ml, un)
  // = averagePrice / conversionFactor da priceUnit
  baseCostPerUnit: decimal("base_cost_per_unit", { precision: 15, scale: 6 })
    .notNull()
    .default("0"),
  averagePriceManual: boolean("average_price_manual").notNull().default(false),
  hasVariations: boolean("has_variations").notNull().default(false),
  availableForSale: boolean("available_for_sale").notNull().default(false),
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
  priceUnit: one(unit, {
    fields: [ingredient.priceUnitId],
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
