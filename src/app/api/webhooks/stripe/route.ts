import { NextResponse } from "next/server";

import { applyStripeSubscriptionUpdate, constructStripeWebhookEvent, stripeClient } from "@/server/billing/stripe";
import { logServerError } from "@/server/observability/log-error";

export const runtime = "nodejs";

/**
 * Notificação da assinatura recorrente do SaaS via Stripe — a alternativa ao
 * Mercado Pago (`/api/webhooks/mercadopago-platform`). Só os três eventos de
 * ciclo de vida da assinatura em si interessam; cobrança individual
 * (`invoice.*`) já se reflete em `customer.subscription.updated` quando muda
 * o status (ex.: `past_due` depois de uma falha de cobrança).
 */
export async function POST(request: Request) {
  const client = stripeClient();
  if (!client) return NextResponse.json({ ok: true });

  const signature = request.headers.get("stripe-signature");
  const rawBody = await request.text();

  if (!signature) return NextResponse.json({ ok: false, error: "Assinatura ausente." }, { status: 401 });

  const event = constructStripeWebhookEvent(client, rawBody, signature);
  if (!event) return NextResponse.json({ ok: false, error: "Assinatura inválida." }, { status: 401 });

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await applyStripeSubscriptionUpdate(event.data.object);
        break;
      default:
        break;
    }
  } catch (erro) {
    await logServerError("api/webhooks/stripe", erro, { eventType: event.type, eventId: event.id });
  }

  return NextResponse.json({ ok: true });
}
