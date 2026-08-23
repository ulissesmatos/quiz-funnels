import "server-only";

import { CardToken, MercadoPagoConfig, Payment } from "mercadopago";

import { env } from "@/lib/env";

export type CreatePaymentInput = {
  accessToken: string;
  /** Sempre calculado no servidor — nunca o valor que o cliente mandou. */
  transactionAmountCents: number;
  description: string;
  externalReference: string;
  idempotencyKey: string;
  /** `formData` que o Payment Brick devolveu no `onSubmit` — token, payment_method_id, payer, installments, etc. */
  formData: Record<string, unknown>;
};

/**
 * Cria a cobrança de verdade na Mercado Pago, na conta da organização (não
 * numa conta única do SaaS) — é o que o modelo Connect exige.
 *
 * As chaves espalhadas de `formData` vêm primeiro no objeto de propósito:
 * `transaction_amount`/`description`/`external_reference`/`notification_url`
 * sobrescrevem qualquer coisa que o cliente tenha mandado nesses mesmos
 * campos — o valor que vale é sempre o calculado aqui, a partir do preço
 * publicado do bloco de checkout e do cupom já validado no servidor.
 */
export async function createMercadoPagoPayment(input: CreatePaymentInput) {
  const client = new MercadoPagoConfig({ accessToken: input.accessToken, options: { timeout: 8000 } });
  const payment = new Payment(client);

  return payment.create({
    body: {
      ...input.formData,
      transaction_amount: input.transactionAmountCents / 100,
      description: input.description,
      external_reference: input.externalReference,
      notification_url: `${env().BETTER_AUTH_URL}/api/webhooks/mercadopago`,
    },
    requestOptions: { idempotencyKey: input.idempotencyKey },
  });
}

export type ChargeSavedCardInput = {
  accessToken: string;
  customerId: string;
  cardId: string;
  paymentMethodId: string;
  transactionAmountCents: number;
  description: string;
  externalReference: string;
  idempotencyKey: string;
};

/**
 * Cobra um cartão salvo sem pedir dado nenhum de novo — o "1-clique" do
 * upsell. `card_id` sozinho não serve pra pagar: primeiro vira um card token
 * novo (de uso único), só então entra numa cobrança normal.
 */
export async function chargeSavedCard(input: ChargeSavedCardInput) {
  const client = new MercadoPagoConfig({ accessToken: input.accessToken, options: { timeout: 8000 } });

  const cardToken = await new CardToken(client).create({
    body: { card_id: input.cardId, customer_id: input.customerId },
  });
  if (!cardToken.id) throw new Error("Não foi possível gerar o token do cartão salvo.");

  return new Payment(client).create({
    body: {
      transaction_amount: input.transactionAmountCents / 100,
      token: cardToken.id,
      payment_method_id: input.paymentMethodId,
      description: input.description,
      external_reference: input.externalReference,
      notification_url: `${env().BETTER_AUTH_URL}/api/webhooks/mercadopago`,
      payer: { type: "customer", id: input.customerId },
    },
    requestOptions: { idempotencyKey: input.idempotencyKey },
  });
}

export async function getMercadoPagoPayment(accessToken: string, paymentId: string) {
  const client = new MercadoPagoConfig({ accessToken });
  const payment = new Payment(client);
  return payment.get({ id: paymentId });
}

/**
 * `orders.status` só tem os estados finais que o produto precisa distinguir;
 * a Mercado Pago tem mais granularidade (`in_process`, `charged_back`, etc.)
 * — este mapa é o único lugar que decide como cada um cai nos nossos.
 */
export function mapPaymentStatus(mpStatus: string | undefined): "pending" | "approved" | "rejected" | "refunded" | "cancelled" {
  switch (mpStatus) {
    case "approved":
      return "approved";
    case "rejected":
      return "rejected";
    case "cancelled":
      return "cancelled";
    case "refunded":
    case "charged_back":
      return "refunded";
    default:
      // in_process, in_mediation, authorized, ou qualquer status novo que a MP venha a criar.
      return "pending";
  }
}
