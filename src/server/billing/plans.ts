import "server-only";

import { and, eq } from "drizzle-orm";

import { db } from "@/server/db";
import { organizationSubscriptions, plans, type Plan } from "@/server/db/schema";

/** Planos visíveis na página de checkout — `active = false` fica de fora, mas não deixa de existir pra quem já assina nele. */
export async function listActivePlans(): Promise<Plan[]> {
  return db.select().from(plans).where(eq(plans.active, true)).orderBy(plans.sortOrder);
}

/** Um plano específico pra iniciar checkout — só ativo, pra ninguém assinar num plano já tirado de vitrine. */
export async function getPlanById(planId: string): Promise<Plan | null> {
  const [plan] = await db
    .select()
    .from(plans)
    .where(and(eq(plans.id, planId), eq(plans.active, true)))
    .limit(1);

  return plan ?? null;
}

/** O plano em que uma organização nova entra em trial — o destaque, ou o mais barato ativo se ninguém estiver marcado. */
export async function getFeaturedPlan(): Promise<Plan | null> {
  const [destaque] = await db.select().from(plans).where(eq(plans.featured, true)).limit(1);
  if (destaque) return destaque;

  const [primeiro] = await db.select().from(plans).where(eq(plans.active, true)).orderBy(plans.sortOrder).limit(1);
  return primeiro ?? null;
}

export async function getPlanForOrganization(organizationId: string): Promise<Plan | null> {
  const [row] = await db
    .select({ plan: plans })
    .from(organizationSubscriptions)
    .innerJoin(plans, eq(plans.id, organizationSubscriptions.planId))
    .where(eq(organizationSubscriptions.organizationId, organizationId))
    .limit(1);

  return row?.plan ?? null;
}

export type PlanLimits = {
  maxFunnels: number | null;
  maxLeadsPerFunnel: number | null;
  canUseTeam: boolean;
  canUseWebhooks: boolean;
};

/** `null` quando a organização não tem plano associado — hoje só deveria acontecer antes do backfill/checkout inicial. */
export async function getPlanLimits(organizationId: string): Promise<PlanLimits | null> {
  const plan = await getPlanForOrganization(organizationId);
  if (!plan) return null;

  return {
    maxFunnels: plan.maxFunnels,
    maxLeadsPerFunnel: plan.maxLeadsPerFunnel,
    canUseTeam: plan.canUseTeam,
    canUseWebhooks: plan.canUseWebhooks,
  };
}
