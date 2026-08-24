"use server";

import { requireOrganization } from "@/server/auth/session";
import type { ActionResult } from "@/server/shared/action-result";

import { getPlanById } from "./plans";
import { startStripeCheckout } from "./stripe";
import {
  confirmMercadoPagoPixPayment,
  startMercadoPagoCardCheckout,
  startMercadoPagoPixCheckout,
  type BillingCycle,
  type PixCheckoutResult,
} from "./subscriptions";

export type Provider = "mercadopago" | "stripe";

/** Sempre `{ ok, initPoint }` pro cliente redirecionar — não precisa saber qual provedor gerou a URL. */
export type CardCheckoutResult = { ok: true; initPoint: string } | { ok: false; error: string };

export async function startCardCheckoutAction(
  planId: string,
  cycle: BillingCycle,
  provider: Provider,
): Promise<CardCheckoutResult> {
  const { session, organization } = await requireOrganization();

  const plan = await getPlanById(planId);
  if (!plan) return { ok: false, error: "Plano não encontrado." };

  if (provider === "stripe") {
    const result = await startStripeCheckout(organization.id, session.user.email, plan, cycle);
    return result.ok ? { ok: true, initPoint: result.url } : result;
  }

  return startMercadoPagoCardCheckout(organization.id, session.user.email, plan, cycle);
}

/** Só o plano anual — a UI nem oferece Pix pro ciclo mensal. */
export async function startPixCheckoutAction(planId: string): Promise<PixCheckoutResult> {
  const { session, organization } = await requireOrganization();

  const plan = await getPlanById(planId);
  if (!plan) return { ok: false, error: "Plano não encontrado." };

  return startMercadoPagoPixCheckout(organization.id, session.user.email, plan);
}

/** Confere manualmente um Pix ainda não confirmado — cobre o webhook atrasar ou não chegar. */
export async function confirmPixPaymentAction(paymentId: string): Promise<ActionResult> {
  await requireOrganization();

  const { approved } = await confirmMercadoPagoPixPayment(paymentId);
  if (!approved) {
    return { ok: false, error: "Ainda não identificamos o pagamento. Aguarde alguns segundos e tente de novo." };
  }

  return { ok: true };
}
