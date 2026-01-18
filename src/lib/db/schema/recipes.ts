import {
  pgTable,
  text,
  timestamp,
  decimal,
  integer,
  boolean,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { workspace } from "./workspace";
import { category } from "./categories";
import { unit } from "./units";

export const recipeItemTypeEnum = pgEnum("recipe_item_type", [
  "ingredient",
  "variation",
  "recipe",
]);

export const recipe = pgTable("recipe", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspace.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  categoryId: text("category_id").references(() => category.id, {
    onDelete: "set null",
  }),
  yieldQuantity: decimal("yield_quantity", { precision: 15, scale: 4 }).notNull(),
  yieldUnitId: text("yield_unit_id")
    .notNull()
    .references(() => unit.id),
  prepTime: integer("prep_time"),
  tags: text("tags").array(),
  allergens: text("allergens").array(),
  availableForSale: boolean("available_for_sale").notNull().default(false),
  totalCost: decimal("total_cost", { precision: 15, scale: 4 })
    .notNull()
    .default("0"),
  totalTime: integer("total_time").default(0), // in minutes, sum of steps
  laborCost: decimal("labor_cost", { precision: 15, scale: 4 })
    .notNull()
    .default("0"),
  costPerPortion: decimal("cost_per_portion", { precision: 15, scale: 4 })
    .notNull()
    .default("0"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const recipeItem = pgTable("recipe_item", {
  id: text("id").primaryKey(),
  recipeId: text("recipe_id")
    .notNull()
    .references(() => recipe.id, { onDelete: "cascade" }),
  type: recipeItemTypeEnum("type").notNull(),
  itemId: text("item_id").notNull(),
  quantity: decimal("quantity", { precision: 15, scale: 4 }).notNull(),
  unitId: text("unit_id")
    .notNull()
    .references(() => unit.id),
  calculatedCost: decimal("calculated_cost", { precision: 15, scale: 4 })
    .notNull()
    .default("0"),
  order: integer("order").notNull().default(0),
});

export const recipeStep = pgTable("recipe_step", {
  id: text("id").primaryKey(),
  recipeId: text("recipe_id")
    .notNull()
    .references(() => recipe.id, { onDelete: "cascade" }),
  order: integer("order").notNull(),
  description: text("description").notNull(),
  time: integer("time"),
});

export const recipeRelations = relations(recipe, ({ one, many }) => ({
  workspace: one(workspace, {
    fields: [recipe.workspaceId],
    references: [workspace.id],
  }),
  category: one(category, {
    fields: [recipe.categoryId],
    references: [category.id],
  }),
  yieldUnit: one(unit, {
    fields: [recipe.yieldUnitId],
    references: [unit.id],
  }),
  items: many(recipeItem),
  steps: many(recipeStep),
}));

export const recipeItemRelations = relations(recipeItem, ({ one }) => ({
  recipe: one(recipe, {
    fields: [recipeItem.recipeId],
    references: [recipe.id],
  }),
  unit: one(unit, {
    fields: [recipeItem.unitId],
    references: [unit.id],
  }),
}));

export const recipeStepRelations = relations(recipeStep, ({ one }) => ({
  recipe: one(recipe, {
    fields: [recipeStep.recipeId],
    references: [recipe.id],
  }),
}));
