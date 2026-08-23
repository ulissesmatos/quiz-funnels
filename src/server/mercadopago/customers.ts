import "server-only";

import { Customer, MercadoPagoConfig } from "mercadopago";

export type SavedCard = { customerId: string; cardId: string; paymentMethodId: string };

/**
 * Tenta salvar o cartão usado num pagamento aprovado, pra permitir cobrar de
 * novo sem formulário (bloco Upsell). Só faz sentido pra cartão — PIX e
 * boleto não têm o que salvar.
 *
 * Best-effort de propósito: salvar o cartão nunca deve derrubar a compra
 * original. Se falhar (token já consumido pelo pagamento, e-mail duplicado
 * como cliente, o que for), a compra já está aprovada de qualquer forma — só
 * não haverá oferta de upsell 1-clique depois.
 */
export async function trySaveCard(
  accessToken: string,
  paymentTypeId: string | undefined,
  payerEmail: string | null,
  cardToken: string | undefined,
  cardPaymentMethodId: string | undefined,
): Promise<SavedCard | null> {
  if (!cardToken || !payerEmail || !cardPaymentMethodId) return null;
  if (paymentTypeId !== "credit_card" && paymentTypeId !== "debit_card") return null;

  try {
    const client = new MercadoPagoConfig({ accessToken, options: { timeout: 8000 } });
    const customer = new Customer(client);

    const created = await customer.create({ body: { email: payerEmail } });
    if (!created.id) return null;

    const card = await customer.createCard({ customerId: created.id, body: { token: cardToken } });
    if (!card.id) return null;

    return { customerId: created.id, cardId: card.id, paymentMethodId: cardPaymentMethodId };
  } catch {
    return null;
  }
}
