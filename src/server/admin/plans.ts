import "server-only";

import { count, eq } from "drizzle-orm";

import { db } from "@/server/db";
import { organizationSubscriptions, plans, type Plan } from "@/server/db/schema";

export type AdminPlanRow = Plan & { subscriberCount: number };

export async function listPlansForAdmin(): Promise<AdminPlanRow[]> {
  const rows = await db
    .select({ plan: plans, subscriberCount: count(organizationSubscriptions.id) })
    .from(plans)
    .leftJoin(organizationSubscriptions, eq(organizationSubscriptions.planId, plans.id))
    .groupBy(plans.id)
    .orderBy(plans.sortOrder);

  return rows.map((row) => ({ ...row.plan, subscriberCount: row.subscriberCount }));
}

export async function getPlanDetail(planId: string): Promise<AdminPlanRow | null> {
  const [row] = await db
    .select({ plan: plans, subscriberCount: count(organizationSubscriptions.id) })
    .from(plans)
    .leftJoin(organizationSubscriptions, eq(organizationSubscriptions.planId, plans.id))
    .where(eq(plans.id, planId))
    .groupBy(plans.id)
    .limit(1);

  return row ? { ...row.plan, subscriberCount: row.subscriberCount } : null;
}

export async function countActiveSubscriptionsForPlan(planId: string): Promise<number> {
  const [row] = await db
    .select({ total: count() })
    .from(organizationSubscriptions)
    .where(eq(organizationSubscriptions.planId, planId));

  return row?.total ?? 0;
}
