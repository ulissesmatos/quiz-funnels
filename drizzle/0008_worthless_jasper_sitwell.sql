CREATE TABLE "plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"monthly_price_cents" integer NOT NULL,
	"currency" text DEFAULT 'BRL' NOT NULL,
	"trial_days" integer DEFAULT 7 NOT NULL,
	"max_funnels" integer,
	"max_leads_per_funnel" integer,
	"can_use_team" boolean DEFAULT false NOT NULL,
	"can_use_webhooks" boolean DEFAULT false NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"stripe_product_id" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "plans_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "funnels" ADD COLUMN "auto_unpublished_at" timestamp;--> statement-breakpoint
ALTER TABLE "organization_subscriptions" ADD COLUMN "plan_id" uuid;--> statement-breakpoint
ALTER TABLE "organization_subscriptions" ADD COLUMN "provider" text;--> statement-breakpoint
ALTER TABLE "organization_subscriptions" ADD COLUMN "billing_cycle" text;--> statement-breakpoint
ALTER TABLE "organization_subscriptions" ADD COLUMN "stripe_subscription_id" text;--> statement-breakpoint
ALTER TABLE "organization_subscriptions" ADD COLUMN "stripe_customer_id" text;--> statement-breakpoint
ALTER TABLE "organization_subscriptions" ADD CONSTRAINT "organization_subscriptions_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE no action ON UPDATE no action;