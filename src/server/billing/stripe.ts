import "server-only";

import { eq } from "drizzle-orm";
import Stripe from "stripe";

import { env } from "@/lib/env";
import { db } from "@/server/db";
import { organizationSubscriptions, plans, type Plan } from "@/server/db/schema";

import type { BillingCycle } from "./subscriptions";

export function stripeClient(): Stripe | null {
  const secretKey = env().STRIPE_SECRET_KEY;
  if (!secretKey) return null;
  return new Stripe(secretKey);
}

/**
 * Garante um `Product` na Stripe pra este plano — criado uma vez (primeiro
 * checkout Stripe deste plano) e reaproveitado depois. Não exige configurar
 * nada manualmente no dashboard Stripe: o preço em si vai inline
 * (`price_data`) em cada Checkout Session, não como um `Price` pré-criado.
 */
async function ensureStripeProduct(client: Stripe, plan: Plan): Promise<string> {
  if (plan.stripeProductId) return plan.stripeProductId;

  const product = await client.products.create({ name: plan.name, metadata: { plan_id: plan.id } });
  await db.update(plans).set({ stripeProductId: product.id, updatedAt: new Date() }).where(eq(plans.id, plan.id));
  return product.id;
}

export type StripeCheckoutResult = { ok: true; url: string } | { ok: false; error: string };

/**
 * Checkout hospedado da Stripe (`mode: "subscription"`) — mensal ou anual
 * conforme `cycle`, recorrência nativa dos dois nesta API, sem precisar de
 * lógica própria de renovação como o Pix da Mercado Pago exige.
 */
export async function startStripeCheckout(
  organizationId: string,
  payerEmail: string,
  plan: Plan,
  cycle: BillingCycle,
): Promise<StripeCheckoutResult> {
  const client = stripeClient();
  if (!client) return { ok: false, error: "Stripe ainda não está configurado neste ambiente." };

  const productId = await ensureStripeProduct(client, plan);
  const unitAmount = cycle === "annual" ? plan.monthlyPriceCents * 12 : plan.monthlyPriceCents;

  const [existing] = await db
    .select({ stripeCustomerId: organizationSubscriptions.stripeCustomerId })
    .from(organizationSubscriptions)
    .where(eq(organizationSubscriptions.organizationId, organizationId))
    .limit(1);

  const customerId =
    existing?.stripeCustomerId ??
    (await client.customers.create({ email: payerEmail, metadata: { organization_id: organizationId } })).id;

  const baseUrl = env().BETTER_AUTH_URL;

  const session = await client.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    client_reference_id: organizationId,
    line_items: [
      {
        price_data: {
          currency: plan.currency.toLowerCase(),
          product: productId,
          unit_amount: unitAmount,
          recurring: { interval: cycle === "annual" ? "year" : "month" },
        },
        quantity: 1,
      },
    ],
    success_url: `${baseUrl}/configuracoes/planos?assinatura=confirmada`,
    cancel_url: `${baseUrl}/configuracoes/planos`,
    metadata: { organization_id: organizationId, plan_id: plan.id, billing_cycle: cycle },
  });

  if (!session.url) return { ok: false, error: "Não foi possível iniciar o checkout." };

  await db
    .update(organizationSubscriptions)
    .set({
      planId: plan.id,
      provider: "stripe",
      billingCycle: cycle,
      stripeCustomerId: customerId,
      updatedAt: new Date(),
    })
    .where(eq(organizationSubscriptions.organizationId, organizationId));

  return { ok: true, url: session.url };
}

/** Stripe tem mais estados do que os 3 que o produto distingue — `paused` cai junto de `past_due`: não está cobrando, mas também não foi cancelada. */
export function mapStripeSubscriptionStatus(
  status: Stripe.Subscription.Status,
): "active" | "past_due" | "canceled" | null {
  switch (status) {
    case "active":
    case "trialing":
      return "active";
    case "past_due":
    case "unpaid":
    case "incomplete":
    case "paused":
      return "past_due";
    case "canceled":
    case "incomplete_expired":
      return "canceled";
    default:
      return null;
  }
}

/**
 * `current_period_end` mora no item da assinatura nesta versão da API da
 * Stripe, não na assinatura em si — pega do primeiro item, que é sempre o
 * único aqui (uma assinatura, um plano, uma `price_data` por checkout).
 */
export async function applyStripeSubscriptionUpdate(subscription: Stripe.Subscription): Promise<void> {
  const status = mapStripeSubscriptionStatus(subscription.status);
  if (!status) return;

  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
  const currentPeriodEnd = subscription.items.data[0]?.current_period_end;

  await db
    .update(organizationSubscriptions)
    .set({
      status,
      stripeSubscriptionId: subscription.id,
      currentPeriodEnd: currentPeriodEnd ? new Date(currentPeriodEnd * 1000) : undefined,
      updatedAt: new Date(),
    })
    .where(eq(organizationSubscriptions.stripeCustomerId, customerId));
}

/** `null` quando a assinatura de webhook não confere (chave errada) ou não está configurada — nunca lança. */
export function constructStripeWebhookEvent(client: Stripe, payload: string, signature: string): Stripe.Event | null {
  const secret = env().STRIPE_WEBHOOK_SECRET;
  if (!secret) return null;

  try {
    return client.webhooks.constructEvent(payload, signature, secret);
  } catch {
    return null;
  }
}
