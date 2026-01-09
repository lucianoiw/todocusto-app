import {
  pgTable,
  text,
  timestamp,
  decimal,
  boolean,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { workspace } from "./workspace";
import { category } from "./categories";
import { unit } from "./units";

export const productItemTypeEnum = pgEnum("product_item_type", [
  "ingredient",
  "variation",
  "recipe",
  "product",
]);

export const product = pgTable("product", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspace.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  categoryId: text("category_id").references(() => category.id, {
    onDelete: "set null",
  }),
  tags: text("tags").array(),
  baseCost: decimal("base_cost", { precision: 15, scale: 4 })
    .notNull()
    .default("0"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const productComposition = pgTable("product_composition", {
  id: text("id").primaryKey(),
  productId: text("product_id")
    .notNull()
    .references(() => product.id, { onDelete: "cascade" }),
  type: productItemTypeEnum("type").notNull(),
  itemId: text("item_id").notNull(),
  quantity: decimal("quantity", { precision: 15, scale: 4 }).notNull(),
  unitId: text("unit_id").references(() => unit.id),
  calculatedCost: decimal("calculated_cost", { precision: 15, scale: 4 })
    .notNull()
    .default("0"),
});

export const productRelations = relations(product, ({ one, many }) => ({
  workspace: one(workspace, {
    fields: [product.workspaceId],
    references: [workspace.id],
  }),
  category: one(category, {
    fields: [product.categoryId],
    references: [category.id],
  }),
  compositions: many(productComposition),
}));

export const productCompositionRelations = relations(
  productComposition,
  ({ one }) => ({
    product: one(product, {
      fields: [productComposition.productId],
      references: [product.id],
    }),
    unit: one(unit, {
      fields: [productComposition.unitId],
      references: [unit.id],
    }),
  })
);
