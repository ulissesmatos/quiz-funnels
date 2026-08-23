import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { parseFunnelDocument } from "@/funnel/schema";
import { findBlock } from "@/funnel/ops";
import { calcularDesconto, validateCoupon } from "@/server/coupons/validate";
import { db } from "@/server/db";
import { funnels, orders } from "@/server/db/schema";
import { getFunnelVersionDocument } from "@/server/funnels/queries";
import { getValidAccessToken } from "@/server/mercadopago/connections";
import { trySaveCard } from "@/server/mercadopago/customers";
import { createMercadoPagoPayment, mapPaymentStatus } from "@/server/mercadopago/payments";
import { logServerError } from "@/server/observability/log-error";
import { checkRateLimit, getClientIp } from "@/server/security/rate-limit";

export const runtime = "nodejs";

const BodySchema = z.object({
  funnelId: z.string().uuid(),
  sessionId: z.string().uuid(),
  blockId: z.string(),
  couponCode: z.string().optional(),
  includeBump: z.boolean().optional(),
  formData: z.record(z.string(), z.unknown()),
});

/**
 * Recebe o `formData` do Payment Brick e cobra de verdade.
 *
 * Sem sessão nenhuma — quem chama é o visitante do funil público. A
 * segurança está em nunca confiar em preço vindo do cliente: o valor cobrado
 * sempre vem do bloco de checkout na VERSÃO PUBLICADA do funil, com o cupom
 * revalidado aqui, nunca do que o navegador mandou.
 */
/**
 * 8 tentativas/min por IP. Baixo de propósito: é a defesa contra card
 * testing (alguém tentando muitos números de cartão roubados num checkout
 * público sem sessão nenhuma) — um comprador de verdade nunca bate isso.
 */
export async function POST(request: Request) {
  const limite = checkRateLimit(`checkout:${getClientIp(request)}`, { windowSeconds: 60, max: 8 });
  if (!limite.ok) {
    return NextResponse.json(
      { ok: false, error: "Muitas tentativas. Aguarde um instante e tente de novo." },
      { status: 429, headers: { "retry-after": String(limite.retryAfterSeconds) } },
    );
  }

  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Requisição inválida." }, { status: 400 });

  const { funnelId, sessionId, blockId, couponCode, includeBump, formData } = parsed.data;

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
  if (!found || found.block.type !== "checkout") {
    return NextResponse.json({ ok: false, error: "Bloco de checkout não encontrado." }, { status: 404 });
  }
  const checkoutProps = found.block.props;

  const accessToken = await getValidAccessToken(funnel.organizationId);
  if (!accessToken) {
    return NextResponse.json(
      { ok: false, error: "Este funil ainda não está pronto para receber pagamento." },
      { status: 503 },
    );
  }

  const bumpAmountCents = includeBump ? (checkoutProps.bump?.amountCents ?? 0) : 0;
  const baseAmountCents = checkoutProps.amountCents + bumpAmountCents;

  let amountCents = baseAmountCents;
  let appliedCouponCode: string | null = null;

  if (couponCode) {
    const validation = await validateCoupon(funnelId, couponCode);
    if (validation.ok) {
      amountCents -= calcularDesconto(amountCents, validation.coupon);
      appliedCouponCode = validation.coupon.code;
    }
    // Cupom inválido não bloqueia o pagamento — só não aplica o desconto.
  }

  const payerEmail = extrairString(formData, "payer", "email");

  const [order] = await db
    .insert(orders)
    .values({
      funnelId,
      sessionId,
      amountCents,
      bumpAmountCents,
      customerEmail: payerEmail,
      couponCode: appliedCouponCode,
      discountCents: baseAmountCents - amountCents,
    })
    .returning();

  try {
    const payment = await createMercadoPagoPayment({
      accessToken,
      transactionAmountCents: amountCents,
      description: checkoutProps.title,
      externalReference: order.id,
      idempotencyKey: order.id,
      formData,
    });

    // Best-effort: só tenta guardar o cartão quando o pagamento foi aprovado
    // de verdade — nunca vale a pena salvar o cartão de uma cobrança recusada.
    const saved =
      payment.status === "approved"
        ? await trySaveCard(
            accessToken,
            payment.payment_type_id,
            payerEmail,
            typeof formData.token === "string" ? formData.token : undefined,
            typeof formData.payment_method_id === "string" ? formData.payment_method_id : undefined,
          )
        : null;

    await db
      .update(orders)
      .set({
        providerPaymentId: String(payment.id),
        status: mapPaymentStatus(payment.status),
        mpCustomerId: saved?.customerId,
        mpCardId: saved?.cardId,
        mpCardPaymentMethodId: saved?.paymentMethodId,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, order.id));

    const transactionData = payment.point_of_interaction?.transaction_data;

    return NextResponse.json({
      ok: true,
      orderId: order.id,
      status: payment.status,
      statusDetail: payment.status_detail,
      pix: transactionData?.qr_code
        ? { qrCode: transactionData.qr_code, qrCodeBase64: transactionData.qr_code_base64 }
        : undefined,
      ticketUrl: payment.transaction_details?.external_resource_url ?? transactionData?.ticket_url,
    });
  } catch (erro) {
    await db.update(orders).set({ status: "rejected", updatedAt: new Date() }).where(eq(orders.id, order.id));
    await logServerError("api/checkout/pay", erro, { orderId: order.id, funnelId });
    return NextResponse.json({ ok: false, error: "Não foi possível processar o pagamento." }, { status: 502 });
  }
}

function extrairString(formData: Record<string, unknown>, ...path: string[]): string | null {
  let atual: unknown = formData;
  for (const chave of path) {
    if (!atual || typeof atual !== "object" || !(chave in atual)) return null;
    atual = (atual as Record<string, unknown>)[chave];
  }
  return typeof atual === "string" ? atual : null;
}
