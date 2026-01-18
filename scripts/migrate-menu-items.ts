import { sql } from "drizzle-orm";
import { db } from "../src/lib/db";

async function migrate() {
  console.log("Starting migration...");

  try {
    // Create the enum type
    console.log("Creating menu_item_type enum...");
    await db.execute(sql`
      DO $$ BEGIN
        CREATE TYPE "menu_item_type" AS ENUM('product', 'ingredient', 'recipe');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Add item_type column
    console.log("Adding item_type column...");
    await db.execute(sql`
      ALTER TABLE "menu_product"
      ADD COLUMN IF NOT EXISTS "item_type" "menu_item_type" DEFAULT 'product' NOT NULL;
    `);

    // Rename product_id to item_id
    console.log("Renaming product_id to item_id...");
    await db.execute(sql`
      ALTER TABLE "menu_product"
      RENAME COLUMN "product_id" TO "item_id";
    `);

    // Drop the old foreign key constraint
    console.log("Dropping old foreign key constraint...");
    await db.execute(sql`
      ALTER TABLE "menu_product"
      DROP CONSTRAINT IF EXISTS "menu_product_product_id_product_id_fk";
    `);

    // Add available_for_sale to ingredient
    console.log("Adding available_for_sale to ingredient...");
    await db.execute(sql`
      ALTER TABLE "ingredient"
      ADD COLUMN IF NOT EXISTS "available_for_sale" boolean DEFAULT false NOT NULL;
    `);

    // Add available_for_sale to recipe
    console.log("Adding available_for_sale to recipe...");
    await db.execute(sql`
      ALTER TABLE "recipe"
      ADD COLUMN IF NOT EXISTS "available_for_sale" boolean DEFAULT false NOT NULL;
    `);

    console.log("Migration completed successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }

  process.exit(0);
}

migrate();
