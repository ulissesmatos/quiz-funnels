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
 *
 * Exceção dentro de `active`: quando `currentPeriodEnd` já passou, trata como
 * bloqueada mesmo sem o status ter sido atualizado. Cobre a assinatura anual
 * paga por Pix (pagamento único, sem renovação automática) — como este app
 * não tem infraestrutura de cron, não existe quem "expire" a linha fisicamente
 * quando a data chega; o vencimento é comparado aqui, na leitura.
 */
export function isEditingBlocked(
  subscription: { status: string; currentPeriodEnd: Date | null } | null,
): boolean {
  if (!subscription) return false;
  if (subscription.status === "past_due" || subscription.status === "canceled") return true;
  if (subscription.status === "active" && subscription.currentPeriodEnd !== null) {
    return subscription.currentPeriodEnd.getTime() < Date.now();
  }
  return false;
}
