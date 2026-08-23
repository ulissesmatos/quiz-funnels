import "server-only";

import { count, desc, eq } from "drizzle-orm";

import { db } from "@/server/db";
import { adminAuditLogs, errorLogs, organization, organizationSubscriptions, user } from "@/server/db/schema";
import { since } from "@/server/analytics/queries";
import { PLAN } from "@/server/billing/plan";

export type SubscriptionCounts = Record<"trialing" | "active" | "past_due" | "canceled", number>;

export type AdminDashboardMetrics = {
  totalOrganizations: number;
  subscriptionCounts: SubscriptionCounts;
  mrrCents: number;
  signupsLast7d: number;
  signupsLast30d: number;
  errorsLast24h: number;
  recentOrganizations: { id: string; name: string; slug: string; createdAt: Date }[];
  recentErrors: { id: string; source: string; message: string; createdAt: Date }[];
  recentAuditEntries: { id: string; action: string; actorName: string; targetId: string; createdAt: Date }[];
};

/**
 * Uma consulta por métrica em vez de uma megaquery só — o painel não é
 * caminho quente (visita ocasional de operador), então clareza vale mais que
 * economizar round-trips aqui.
 */
export async function getAdminDashboardMetrics(): Promise<AdminDashboardMetrics> {
  const [
    totalOrganizations,
    statusRows,
    signupsLast7d,
    signupsLast30d,
    errorsLast24h,
    recentOrganizations,
    recentErrors,
    recentAuditRows,
  ] = await Promise.all([
    db.select({ total: count() }).from(organization),
    db
      .select({ status: organizationSubscriptions.status, total: count() })
      .from(organizationSubscriptions)
      .groupBy(organizationSubscriptions.status),
    db.select({ total: count() }).from(organization).where(since(organization.createdAt, 7)),
    db.select({ total: count() }).from(organization).where(since(organization.createdAt, 30)),
    db.select({ total: count() }).from(errorLogs).where(since(errorLogs.createdAt, 1)),
    db
      .select({ id: organization.id, name: organization.name, slug: organization.slug, createdAt: organization.createdAt })
      .from(organization)
      .orderBy(desc(organization.createdAt))
      .limit(5),
    db
      .select({ id: errorLogs.id, source: errorLogs.source, message: errorLogs.message, createdAt: errorLogs.createdAt })
      .from(errorLogs)
      .orderBy(desc(errorLogs.createdAt))
      .limit(5),
    db
      .select({
        id: adminAuditLogs.id,
        action: adminAuditLogs.action,
        targetId: adminAuditLogs.targetId,
        createdAt: adminAuditLogs.createdAt,
        actorName: user.name,
      })
      .from(adminAuditLogs)
      .innerJoin(user, eq(user.id, adminAuditLogs.actorUserId))
      .orderBy(desc(adminAuditLogs.createdAt))
      .limit(5),
  ]);

  const subscriptionCounts: SubscriptionCounts = { trialing: 0, active: 0, past_due: 0, canceled: 0 };
  for (const row of statusRows) {
    if (row.status && row.status in subscriptionCounts) subscriptionCounts[row.status] = row.total;
  }

  return {
    totalOrganizations: totalOrganizations[0]?.total ?? 0,
    subscriptionCounts,
    mrrCents: subscriptionCounts.active * PLAN.priceCents,
    signupsLast7d: signupsLast7d[0]?.total ?? 0,
    signupsLast30d: signupsLast30d[0]?.total ?? 0,
    errorsLast24h: errorsLast24h[0]?.total ?? 0,
    recentOrganizations,
    recentErrors,
    recentAuditEntries: recentAuditRows,
  };
}
