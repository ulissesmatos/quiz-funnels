import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { findBlock } from "@/funnel/ops";
import { parseFunnelDocument } from "@/funnel/schema";
import { db } from "@/server/db";
import { funnels, orders } from "@/server/db/schema";
import { getFunnelVersionDocument } from "@/server/funnels/queries";
import { getValidAccessToken } from "@/server/mercadopago/connections";
import { chargeSavedCard, mapPaymentStatus } from "@/server/mercadopago/payments";
import { logServerError } from "@/server/observability/log-error";

export const runtime = "nodejs";

const BodySchema = z.object({
  funnelId: z.string().uuid(),
  sessionId: z.string().uuid(),
  blockId: z.string(),
  parentOrderId: z.string().uuid(),
});

/**
 * Cobra o upsell no cartão salvo do pedido anterior — sem `formData` nenhum,
 * porque não existe formulário: é o "1-clique" de verdade. Se o pedido
 * anterior não tiver cartão salvo (PIX/boleto, ou o salvamento falhou na
 * hora), devolve erro — o bloco no cliente já sabe não oferecer o botão
 * nesse caso, mas a checagem aqui é a que vale de verdade.
 */
export async function POST(request: Request) {
  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Requisição inválida." }, { status: 400 });

  const { funnelId, sessionId, blockId, parentOrderId } = parsed.data;

  const [parentOrder] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, parentOrderId), eq(orders.funnelId, funnelId), eq(orders.status, "approved")))
    .limit(1);

  if (!parentOrder?.mpCustomerId || !parentOrder.mpCardId || !parentOrder.mpCardPaymentMethodId) {
    return NextResponse.json({ ok: false, error: "Esta oferta não está disponível." }, { status: 422 });
  }

  const [funnel] = await db
    .select({ organizationId: funnels.organizationId, publishedVersionId: funnels.publishedVersionId })
    .from(funnels)
    .where(eq(funnels.id, funnelId))
    .limit(1);
  if (!funnel?.publishedVersionId) {
    return NextResponse.json({ ok: false, error: "Funil não encontrado." }, { status: 404 });
  }

  const publishedDocument = await getFunnelVersionDocument(funnel.publishedVersionId);
  const parsedDoc = publishedDocument ? parseFunnelDocument(publishedDocument) : null;
  if (!parsedDoc?.success) {
    return NextResponse.json({ ok: false, error: "Funil não encontrado." }, { status: 404 });
  }

  const found = findBlock(parsedDoc.data, blockId);
  if (!found || found.block.type !== "upsell") {
    return NextResponse.json({ ok: false, error: "Bloco de upsell não encontrado." }, { status: 404 });
  }
  const upsellProps = found.block.props;

  const accessToken = await getValidAccessToken(funnel.organizationId);
  if (!accessToken) {
    return NextResponse.json({ ok: false, error: "Este funil ainda não está pronto para receber pagamento." }, { status: 503 });
  }

  const [order] = await db
    .insert(orders)
    .values({
      funnelId,
      sessionId,
      parentOrderId,
      amountCents: upsellProps.amountCents,
      customerEmail: parentOrder.customerEmail,
    })
    .returning();

  try {
    const payment = await chargeSavedCard({
      accessToken,
      customerId: parentOrder.mpCustomerId,
      cardId: parentOrder.mpCardId,
      paymentMethodId: parentOrder.mpCardPaymentMethodId,
      transactionAmountCents: upsellProps.amountCents,
      description: upsellProps.title,
      externalReference: order.id,
      idempotencyKey: order.id,
    });

    await db
      .update(orders)
      .set({ providerPaymentId: String(payment.id), status: mapPaymentStatus(payment.status), updatedAt: new Date() })
      .where(eq(orders.id, order.id));

    return NextResponse.json({ ok: true, orderId: order.id, status: payment.status });
  } catch (erro) {
    await db.update(orders).set({ status: "rejected", updatedAt: new Date() }).where(eq(orders.id, order.id));
    await logServerError("api/checkout/upsell", erro, { orderId: order.id, parentOrderId });
    return NextResponse.json({ ok: false, error: "Não foi possível processar a cobrança." }, { status: 502 });
  }
}
