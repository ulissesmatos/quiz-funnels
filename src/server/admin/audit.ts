import "server-only";

import { count, desc, eq } from "drizzle-orm";

import { db } from "@/server/db";
import { adminAuditLogs, user } from "@/server/db/schema";

type AuditAction =
  | "impersonate_start"
  | "impersonate_stop"
  | "subscription_override"
  | "promote_super_admin"
  | "demote_super_admin";

type AuditTarget = { type: "organization" | "user"; id: string };

export async function logAdminAction(
  actorUserId: string,
  action: AuditAction,
  target: AuditTarget,
  metadata?: Record<string, unknown>,
) {
  await db.insert(adminAuditLogs).values({
    actorUserId,
    action,
    targetType: target.type,
    targetId: target.id,
    metadata: metadata ?? {},
  });
}

export const AUDIT_LOGS_PAGE_SIZE = 30;

export type AuditLogRow = {
  id: string;
  action: AuditAction;
  targetType: "organization" | "user";
  targetId: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
  actorName: string;
  actorEmail: string;
};

export async function listAuditLogs(page: number): Promise<{ items: AuditLogRow[]; total: number }> {
  const offset = (Math.max(1, page) - 1) * AUDIT_LOGS_PAGE_SIZE;

  const [items, [{ total }]] = await Promise.all([
    db
      .select({
        id: adminAuditLogs.id,
        action: adminAuditLogs.action,
        targetType: adminAuditLogs.targetType,
        targetId: adminAuditLogs.targetId,
        metadata: adminAuditLogs.metadata,
        createdAt: adminAuditLogs.createdAt,
        actorName: user.name,
        actorEmail: user.email,
      })
      .from(adminAuditLogs)
      .innerJoin(user, eq(user.id, adminAuditLogs.actorUserId))
      .orderBy(desc(adminAuditLogs.createdAt))
      .limit(AUDIT_LOGS_PAGE_SIZE)
      .offset(offset),
    db.select({ total: count() }).from(adminAuditLogs),
  ]);

  return { items, total };
}
