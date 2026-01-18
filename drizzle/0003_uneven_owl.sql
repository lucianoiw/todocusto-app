-- First convert to text to allow value changes
ALTER TABLE "workspace" ALTER COLUMN "establishment_type" SET DATA TYPE text;--> statement-breakpoint

-- Update existing Portuguese values to English
UPDATE "workspace" SET "establishment_type" = 'pizzeria' WHERE "establishment_type" = 'pizzaria';--> statement-breakpoint
UPDATE "workspace" SET "establishment_type" = 'burger_shop' WHERE "establishment_type" = 'hamburgueria';--> statement-breakpoint
UPDATE "workspace" SET "establishment_type" = 'bakery' WHERE "establishment_type" = 'confeitaria';--> statement-breakpoint
UPDATE "workspace" SET "establishment_type" = 'restaurant' WHERE "establishment_type" = 'restaurante';--> statement-breakpoint
UPDATE "workspace" SET "establishment_type" = 'other' WHERE "establishment_type" = 'outros';--> statement-breakpoint

-- Set new default before dropping enum
ALTER TABLE "workspace" ALTER COLUMN "establishment_type" SET DEFAULT 'other'::text;--> statement-breakpoint

-- Drop old enum and create new one with English values
DROP TYPE "public"."establishment_type";--> statement-breakpoint
CREATE TYPE "public"."establishment_type" AS ENUM('pizzeria', 'burger_shop', 'bar', 'bakery', 'restaurant', 'other');--> statement-breakpoint

-- Convert column back to new enum
ALTER TABLE "workspace" ALTER COLUMN "establishment_type" SET DEFAULT 'other'::"public"."establishment_type";--> statement-breakpoint
ALTER TABLE "workspace" ALTER COLUMN "establishment_type" SET DATA TYPE "public"."establishment_type" USING "establishment_type"::"public"."establishment_type";
