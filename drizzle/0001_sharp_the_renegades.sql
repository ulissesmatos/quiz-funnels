CREATE TABLE "organization_settings" (
	"organization_id" text PRIMARY KEY NOT NULL,
	"default_theme_mode" text DEFAULT 'dark' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "organization_settings" ADD CONSTRAINT "organization_settings_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;