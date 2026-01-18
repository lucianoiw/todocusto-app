-- Add menu item type enum
CREATE TYPE "public"."menu_item_type" AS ENUM('product', 'ingredient', 'recipe');

-- Add item_type column to menu_product
ALTER TABLE "menu_product" ADD COLUMN "item_type" "menu_item_type" DEFAULT 'product' NOT NULL;

-- Rename product_id to item_id
ALTER TABLE "menu_product" RENAME COLUMN "product_id" TO "item_id";

-- Drop foreign key constraint on item_id (was product_id)
ALTER TABLE "menu_product" DROP CONSTRAINT IF EXISTS "menu_product_product_id_product_id_fk";

-- Add available_for_sale to ingredient
ALTER TABLE "ingredient" ADD COLUMN IF NOT EXISTS "available_for_sale" boolean DEFAULT false NOT NULL;

-- Add available_for_sale to recipe
ALTER TABLE "recipe" ADD COLUMN IF NOT EXISTS "available_for_sale" boolean DEFAULT false NOT NULL;
