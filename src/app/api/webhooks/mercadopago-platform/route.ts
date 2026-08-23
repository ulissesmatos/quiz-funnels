import { InvalidWebhookSignatureError, MercadoPagoConfig, PreApproval, WebhookSignatureValidator } from "mercadopago";
import { NextResponse } from "next/server";

import { env } from "@/lib/env";
import { applyPreapprovalStatusUpdate } from "@/server/billing/subscriptions";
import { logServerError } from "@/server/observability/log-error";

export const runtime = "nodejs";

type Notification = { type?: string; data?: { id?: string } };

/**
 * Notificação da assinatura recorrente do SaaS — conta MP da PLATAFORMA, não
 * de um cliente conectado. Rota separada de `/api/webhooks/mercadopago`
 * (aquela é sobre pedidos feitos com o token de organizações via OAuth
 * Connect) porque o segredo, o token e a tabela afetada são todos diferentes.
 *
 * Só `subscription_preapproval` é tratado — é o evento de ciclo de vida da
 * assinatura em si (`authorized`/`paused`/`cancelled`), suficiente pro modelo
 * de 3 estados que o produto usa. `subscription_authorized_payment` (cada
 * cobrança individual) é ignorado: a Mercado Pago já pausa a assinatura
 * sozinha depois de falhas repetidas, o que já chega aqui via
 * `subscription_preapproval`.
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

  const secret = env().MERCADOPAGO_PLATFORM_WEBHOOK_SECRET;
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

  if (body.type !== "subscription_preapproval" || !body.data?.id) {
    return NextResponse.json({ ok: true });
  }

  const accessToken = env().MERCADOPAGO_PLATFORM_ACCESS_TOKEN;
  if (!accessToken) return NextResponse.json({ ok: true });

  try {
    const client = new MercadoPagoConfig({ accessToken });
    const preApproval = await new PreApproval(client).get({ id: body.data.id });
    await applyPreapprovalStatusUpdate(body.data.id, preApproval.status, preApproval.next_payment_date);
  } catch (erro) {
    await logServerError("api/webhooks/mercadopago-platform", erro, { preapprovalId: body.data.id });
  }

  return NextResponse.json({ ok: true });
}
