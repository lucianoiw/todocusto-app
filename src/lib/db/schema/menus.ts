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
import { product } from "./products";

export const apportionmentTypeEnum = pgEnum("apportionment_type", [
  "percentage_of_sale",
  "fixed_per_product",
  "proportional_to_sales",
]);

export const feeTypeEnum = pgEnum("fee_type", ["fixed", "percentage"]);

export const menu = pgTable("menu", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspace.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  active: boolean("active").notNull().default(true),
  apportionmentType: apportionmentTypeEnum("apportionment_type")
    .notNull()
    .default("percentage_of_sale"),
  apportionmentValue: decimal("apportionment_value", {
    precision: 10,
    scale: 4,
  }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const menuFee = pgTable("menu_fee", {
  id: text("id").primaryKey(),
  menuId: text("menu_id")
    .notNull()
    .references(() => menu.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: feeTypeEnum("type").notNull(),
  value: decimal("value", { precision: 15, scale: 4 }).notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const fixedCost = pgTable("fixed_cost", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspace.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  value: decimal("value", { precision: 15, scale: 4 }).notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const menuFixedCost = pgTable("menu_fixed_cost", {
  id: text("id").primaryKey(),
  menuId: text("menu_id")
    .notNull()
    .references(() => menu.id, { onDelete: "cascade" }),
  fixedCostId: text("fixed_cost_id")
    .notNull()
    .references(() => fixedCost.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const menuProduct = pgTable("menu_product", {
  id: text("id").primaryKey(),
  menuId: text("menu_id")
    .notNull()
    .references(() => menu.id, { onDelete: "cascade" }),
  productId: text("product_id")
    .notNull()
    .references(() => product.id, { onDelete: "cascade" }),
  salePrice: decimal("sale_price", { precision: 15, scale: 4 }).notNull(),
  totalCost: decimal("total_cost", { precision: 15, scale: 4 })
    .notNull()
    .default("0"),
  marginValue: decimal("margin_value", { precision: 15, scale: 4 })
    .notNull()
    .default("0"),
  marginPercentage: decimal("margin_percentage", { precision: 10, scale: 4 })
    .notNull()
    .default("0"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Relations
export const menuRelations = relations(menu, ({ one, many }) => ({
  workspace: one(workspace, {
    fields: [menu.workspaceId],
    references: [workspace.id],
  }),
  fees: many(menuFee),
  fixedCosts: many(menuFixedCost),
  products: many(menuProduct),
}));

export const menuFeeRelations = relations(menuFee, ({ one }) => ({
  menu: one(menu, {
    fields: [menuFee.menuId],
    references: [menu.id],
  }),
}));

export const fixedCostRelations = relations(fixedCost, ({ one, many }) => ({
  workspace: one(workspace, {
    fields: [fixedCost.workspaceId],
    references: [workspace.id],
  }),
  menus: many(menuFixedCost),
}));

export const menuFixedCostRelations = relations(menuFixedCost, ({ one }) => ({
  menu: one(menu, {
    fields: [menuFixedCost.menuId],
    references: [menu.id],
  }),
  fixedCost: one(fixedCost, {
    fields: [menuFixedCost.fixedCostId],
    references: [fixedCost.id],
  }),
}));

export const menuProductRelations = relations(menuProduct, ({ one }) => ({
  menu: one(menu, {
    fields: [menuProduct.menuId],
    references: [menu.id],
  }),
  product: one(product, {
    fields: [menuProduct.productId],
    references: [product.id],
  }),
}));
