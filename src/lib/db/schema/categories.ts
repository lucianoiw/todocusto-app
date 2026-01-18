import { pgTable, text, timestamp, pgEnum, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { workspace } from "./workspace";

export const categoryTypeEnum = pgEnum("category_type", [
  "ingredient",
  "recipe",
  "product",
]);

export const category = pgTable("category", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspace.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: categoryTypeEnum("type").notNull(),
  color: text("color"),
  icon: text("icon"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const categoryRelations = relations(category, ({ one }) => ({
  workspace: one(workspace, {
    fields: [category.workspaceId],
    references: [workspace.id],
  }),
}));
