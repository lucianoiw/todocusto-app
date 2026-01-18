CREATE TABLE "size_group" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "size_option" (
	"id" text PRIMARY KEY NOT NULL,
	"size_group_id" text NOT NULL,
	"name" text NOT NULL,
	"multiplier" numeric(10, 4) DEFAULT '1' NOT NULL,
	"is_reference" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN "size_group_id" text;--> statement-breakpoint
ALTER TABLE "menu_product" ADD COLUMN "size_option_id" text;--> statement-breakpoint
ALTER TABLE "size_group" ADD CONSTRAINT "size_group_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "size_option" ADD CONSTRAINT "size_option_size_group_id_size_group_id_fk" FOREIGN KEY ("size_group_id") REFERENCES "public"."size_group"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product" ADD CONSTRAINT "product_size_group_id_size_group_id_fk" FOREIGN KEY ("size_group_id") REFERENCES "public"."size_group"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_product" ADD CONSTRAINT "menu_product_size_option_id_size_option_id_fk" FOREIGN KEY ("size_option_id") REFERENCES "public"."size_option"("id") ON DELETE cascade ON UPDATE no action;