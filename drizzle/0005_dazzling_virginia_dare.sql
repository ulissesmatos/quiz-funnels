ALTER TABLE "orders" ADD COLUMN "parent_order_id" uuid;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "bump_amount_cents" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "mp_customer_id" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "mp_card_id" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "mp_card_payment_method_id" text;--> statement-breakpoint
CREATE INDEX "orders_parent_idx" ON "orders" USING btree ("parent_order_id");