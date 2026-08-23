import "server-only";

import { and, count, desc, eq, ilike, or } from "drizzle-orm";

import { db } from "@/server/db";
import { funnels, member, organization, organizationSubscriptions, user } from "@/server/db/schema";

export type AdminOrganizationRow = {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
  subscriptionStatus: "trialing" | "active" | "past_due" | "canceled" | null;
  trialEndsAt: Date | null;
  currentPeriodEnd: Date | null;
};

export async function listOrganizationsForAdmin(filter?: {
  search?: string;
  status?: "trialing" | "active" | "past_due" | "canceled";
}): Promise<AdminOrganizationRow[]> {
  const conditions = [];
  if (filter?.search) {
    conditions.push(or(ilike(organization.name, `%${filter.search}%`), ilike(organization.slug, `%${filter.search}%`)));
  }
  if (filter?.status) conditions.push(eq(organizationSubscriptions.status, filter.status));

  const query = db
    .select({
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      createdAt: organization.createdAt,
      subscriptionStatus: organizationSubscriptions.status,
      trialEndsAt: organizationSubscriptions.trialEndsAt,
      currentPeriodEnd: organizationSubscriptions.currentPeriodEnd,
    })
    .from(organization)
    .leftJoin(organizationSubscriptions, eq(organizationSubscriptions.organizationId, organization.id))
    .orderBy(desc(organization.createdAt));

  if (conditions.length === 0) return query;
  return query.where(and(...conditions));
}

export type AdminOrganizationDetail = {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
  subscription: {
    status: "trialing" | "active" | "past_due" | "canceled";
    trialEndsAt: Date | null;
    currentPeriodEnd: Date | null;
    mpPreapprovalId: string | null;
    mpPayerEmail: string | null;
  } | null;
  members: { userId: string; name: string; email: string; role: string }[];
  funnelCount: number;
};

export async function getOrganizationDetail(organizationId: string): Promise<AdminOrganizationDetail | null> {
  const [org] = await db
    .select({ id: organization.id, name: organization.name, slug: organization.slug, createdAt: organization.createdAt })
    .from(organization)
    .where(eq(organization.id, organizationId))
    .limit(1);
  if (!org) return null;

  const [subscription, members, [{ funnelCount }]] = await Promise.all([
    db
      .select({
        status: organizationSubscriptions.status,
        trialEndsAt: organizationSubscriptions.trialEndsAt,
        currentPeriodEnd: organizationSubscriptions.currentPeriodEnd,
        mpPreapprovalId: organizationSubscriptions.mpPreapprovalId,
        mpPayerEmail: organizationSubscriptions.mpPayerEmail,
      })
      .from(organizationSubscriptions)
      .where(eq(organizationSubscriptions.organizationId, organizationId))
      .limit(1),
    db
      .select({ userId: user.id, name: user.name, email: user.email, role: member.role })
      .from(member)
      .innerJoin(user, eq(member.userId, user.id))
      .where(eq(member.organizationId, organizationId)),
    db.select({ funnelCount: count() }).from(funnels).where(eq(funnels.organizationId, organizationId)),
  ]);

  return { ...org, subscription: subscription[0] ?? null, members, funnelCount };
}
