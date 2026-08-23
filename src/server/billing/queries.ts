import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/server/db";
import { organizationSubscriptions } from "@/server/db/schema";

export async function getOrganizationSubscription(organizationId: string) {
  const [subscription] = await db
    .select()
    .from(organizationSubscriptions)
    .where(eq(organizationSubscriptions.organizationId, organizationId))
    .limit(1);

  return subscription ?? null;
}

/**
 * `past_due`/`canceled` trava só a EDIÇÃO do funil — o que já está publicado
 * continua no ar normalmente (decisão de produto: um atraso administrativo
 * do dono da conta não deve derrubar a venda que já está rodando pro cliente
 * dele). `trialing` e `active` sempre podem editar; sem linha de assinatura
 * (não deveria acontecer, mas não é motivo pra travar) também pode.
 */
export function isEditingBlocked(subscription: { status: string } | null): boolean {
  if (!subscription) return false;
  return subscription.status === "past_due" || subscription.status === "canceled";
}
