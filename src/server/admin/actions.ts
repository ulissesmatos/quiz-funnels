"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireSuperAdmin } from "@/server/auth/session";
import { db } from "@/server/db";
import { organizationSubscriptions, user } from "@/server/db/schema";
import type { ActionResult } from "@/server/shared/action-result";

import { logAdminAction } from "./audit";
import { startImpersonation, stopImpersonation } from "./impersonation";
import { countSuperAdmins } from "./users";

export async function impersonateOrganizationAction(organizationId: string) {
  const session = await requireSuperAdmin();
  await startImpersonation(session.user, session.session.id, organizationId);
  redirect("/funis");
}

export async function stopImpersonationAction() {
  const session = await requireSuperAdmin();
  await stopImpersonation(session.user, session.session.id);
  redirect("/admin");
}

/** Promove/rebaixa um operador do SaaS. Nunca deixa zerar o total de super admins — ninguém ficaria com acesso ao painel. */
export async function toggleSuperAdminAction(userId: string, next: boolean): Promise<ActionResult> {
  const session = await requireSuperAdmin();

  if (!next && userId === session.user.id) {
    const total = await countSuperAdmins();
    if (total <= 1) return { ok: false, error: "Você é o único super admin — promova outra pessoa antes de sair." };
  }

  await db.update(user).set({ isSuperAdmin: next, updatedAt: new Date() }).where(eq(user.id, userId));
  await logAdminAction(session.user.id, next ? "promote_super_admin" : "demote_super_admin", {
    type: "user",
    id: userId,
  });

  revalidatePath("/admin/usuarios");
  return { ok: true };
}

const SUBSCRIPTION_STATUSES = ["trialing", "active", "past_due", "canceled"] as const;
type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

/** Override manual — comp de cliente, correção de suporte, etc. Só o painel admin faz isto; o fluxo normal é sempre pelo webhook da MP. */
export async function setSubscriptionStatusAction(
  organizationId: string,
  status: SubscriptionStatus,
): Promise<ActionResult> {
  const session = await requireSuperAdmin();
  if (!SUBSCRIPTION_STATUSES.includes(status)) return { ok: false, error: "Status inválido." };

  await db
    .update(organizationSubscriptions)
    .set({ status, updatedAt: new Date() })
    .where(eq(organizationSubscriptions.organizationId, organizationId));

  await logAdminAction(session.user.id, "subscription_override", { type: "organization", id: organizationId }, { status });

  revalidatePath(`/admin/organizacoes/${organizationId}`);
  return { ok: true };
}

export async function extendTrialAction(organizationId: string, days: number): Promise<ActionResult> {
  const session = await requireSuperAdmin();
  if (!Number.isFinite(days) || days <= 0 || days > 90) return { ok: false, error: "Informe um número de dias válido (1-90)." };

  const [current] = await db
    .select({ trialEndsAt: organizationSubscriptions.trialEndsAt })
    .from(organizationSubscriptions)
    .where(eq(organizationSubscriptions.organizationId, organizationId))
    .limit(1);
  if (!current) return { ok: false, error: "Organização sem assinatura registrada." };

  const base = current.trialEndsAt && current.trialEndsAt > new Date() ? current.trialEndsAt : new Date();
  const trialEndsAt = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);

  await db
    .update(organizationSubscriptions)
    .set({ status: "trialing", trialEndsAt, updatedAt: new Date() })
    .where(eq(organizationSubscriptions.organizationId, organizationId));

  await logAdminAction(
    session.user.id,
    "subscription_override",
    { type: "organization", id: organizationId },
    { extendedDays: days, trialEndsAt: trialEndsAt.toISOString() },
  );

  revalidatePath(`/admin/organizacoes/${organizationId}`);
  return { ok: true };
}
