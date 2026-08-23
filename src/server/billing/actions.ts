"use server";

import { requireOrganization } from "@/server/auth/session";

import { startPlatformSubscriptionCheckout, type StartCheckoutResult } from "./subscriptions";

/** Gera o link de autorização da assinatura e devolve pro cliente redirecionar. */
export async function startSubscriptionCheckoutAction(): Promise<StartCheckoutResult> {
  const { session, organization } = await requireOrganization();
  return startPlatformSubscriptionCheckout(organization.id, session.user.email);
}
