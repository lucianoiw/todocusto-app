import {
  pgTable,
  text,
  timestamp,
  decimal,
  integer,
  boolean,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { workspace } from "./workspace";

export const sizeGroup = pgTable("size_group", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspace.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const sizeOption = pgTable("size_option", {
  id: text("id").primaryKey(),
  sizeGroupId: text("size_group_id")
    .notNull()
    .references(() => sizeGroup.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  multiplier: decimal("multiplier", { precision: 10, scale: 4 })
    .notNull()
    .default("1"),
  isReference: boolean("is_reference").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Relations
export const sizeGroupRelations = relations(sizeGroup, ({ one, many }) => ({
  workspace: one(workspace, {
    fields: [sizeGroup.workspaceId],
    references: [workspace.id],
  }),
  options: many(sizeOption),
}));

export const sizeOptionRelations = relations(sizeOption, ({ one }) => ({
  group: one(sizeGroup, {
    fields: [sizeOption.sizeGroupId],
    references: [sizeGroup.id],
  }),
}));
