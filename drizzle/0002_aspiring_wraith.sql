CREATE TYPE "public"."establishment_type" AS ENUM('pizzaria', 'hamburgueria', 'bar', 'confeitaria', 'restaurante', 'outros');--> statement-breakpoint
ALTER TABLE "workspace" ADD COLUMN "establishment_type" "establishment_type" DEFAULT 'outros' NOT NULL;--> statement-breakpoint
ALTER TABLE "category" ADD COLUMN "active" boolean DEFAULT true NOT NULL;