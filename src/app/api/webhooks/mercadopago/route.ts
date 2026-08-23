import { and, eq, sql } from "drizzle-orm";
import { InvalidWebhookSignatureError, WebhookSignatureValidator } from "mercadopago";
import { NextResponse } from "next/server";

import { env } from "@/lib/env";
import { db } from "@/server/db";
import { coupons, funnels, orders } from "@/server/db/schema";
import { getValidAccessToken } from "@/server/mercadopago/connections";
import { getMercadoPagoPayment, mapPaymentStatus } from "@/server/mercadopago/payments";

export const runtime = "nodejs";

type Notification = { type?: string; data?: { id?: string } };

/**
 * Recebe a notificação da Mercado Pago quando um pagamento muda de status.
 *
 * O segredo é único por Application (a nossa, não uma por organização
 * conectada) — confirmado na documentação oficial de webhooks e na versão
 * específica pra marketplace/split payments da mesma página. Todo pagamento
 * criado com o token de qualquer organização conectada por OAuth cai aqui.
 */
export async function POST(request: Request) {
  const url = new URL(request.url);
  const rawBody = await request.text();

  let body: Notification;
  try {
    body = JSON.parse(rawBody) as Notification;
  } catch {
    return NextResponse.json({ ok: true });
  }

  const secret = env().MERCADOPAGO_WEBHOOK_SECRET;
  if (secret) {
    try {
      WebhookSignatureValidator.validate({
        xSignature: request.headers.get("x-signature"),
        xRequestId: request.headers.get("x-request-id"),
        dataId: url.searchParams.get("data.id"),
        secret,
        toleranceSeconds: 300,
      });
    } catch (erro) {
      if (erro instanceof InvalidWebhookSignatureError) {
        return NextResponse.json({ ok: false, error: erro.reason }, { status: 401 });
      }
      throw erro;
    }
  }

  // Só o evento de pagamento nos interessa — merchant_order e outros tipos
  // que a Mercado Pago manda para a mesma URL são ignorados, com 200 mesmo
  // assim (não é erro, só não é relevante).
  if (body.type !== "payment" || !body.data?.id) {
    return NextResponse.json({ ok: true });
  }

  const paymentId = body.data.id;

  const [order] = await db.select().from(orders).where(eq(orders.providerPaymentId, paymentId)).limit(1);
  if (!order) return NextResponse.json({ ok: true });

  const [funnel] = await db
    .select({ organizationId: funnels.organizationId })
    .from(funnels)
    .where(eq(funnels.id, order.funnelId))
    .limit(1);
  if (!funnel) return NextResponse.json({ ok: true });

  const accessToken = await getValidAccessToken(funnel.organizationId);
  if (!accessToken) return NextResponse.json({ ok: true });

  const payment = await getMercadoPagoPayment(accessToken, paymentId);
  const novoStatus = mapPaymentStatus(payment.status);
  const jaEstavaAprovado = order.status === "approved";

  await db.update(orders).set({ status: novoStatus, updatedAt: new Date() }).where(eq(orders.id, order.id));

  // Só soma uso de cupom na transição pra aprovado — nunca num reenvio do
  // mesmo webhook (a Mercado Pago reenvia se não responder 200 a tempo).
  if (!jaEstavaAprovado && novoStatus === "approved" && order.couponCode) {
    await db
      .update(coupons)
      .set({ usedCount: sql`${coupons.usedCount} + 1` })
      .where(and(eq(coupons.organizationId, funnel.organizationId), eq(coupons.code, order.couponCode)));
  }

  return NextResponse.json({ ok: true });
}
