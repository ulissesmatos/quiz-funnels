import "server-only";

import { and, eq, isNull } from "drizzle-orm";
import { headers } from "next/headers";
import { nanoid } from "nanoid";

import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { impersonationLogs, member, organization } from "@/server/db/schema";

import { logAdminAction } from "./audit";

/**
 * `setActiveOrganization` do Better Auth exige membership de verdade
 * (`adapter.checkMembership`, ver dist/plugins/organization/routes/crud-org) —
 * não dá pra simplesmente apontar a sessão pra outra organização. O truque:
 * criar um `member` temporário só pelo instante da chamada (que também é
 * quem re-assina o cookie de sessão com o novo `activeOrganizationId`) e
 * apagar em seguida. Depois disso, `getActiveOrganization` (session.ts)
 * reconhece a organização pela linha em `impersonationLogs`, não por
 * membership — então o `member` não precisa sobreviver.
 */
export async function startImpersonation(admin: { id: string }, sessionId: string, organizationId: string) {
  const tempMemberId = nanoid();

  await db.insert(member).values({
    id: tempMemberId,
    organizationId,
    userId: admin.id,
    role: "owner",
    createdAt: new Date(),
  });

  try {
    await auth.api.setActiveOrganization({ headers: await headers(), body: { organizationId } });
  } finally {
    await db.delete(member).where(eq(member.id, tempMemberId));
  }

  await db.insert(impersonationLogs).values({ adminUserId: admin.id, organizationId, sessionId });
  await logAdminAction(admin.id, "impersonate_start", { type: "organization", id: organizationId });
}

/** Encerra o impersonate ativo (se houver) e devolve a sessão pra própria organização do admin. */
export async function stopImpersonation(admin: { id: string }, sessionId: string) {
  const ended = await db
    .update(impersonationLogs)
    .set({ endedAt: new Date() })
    .where(and(eq(impersonationLogs.sessionId, sessionId), isNull(impersonationLogs.endedAt)))
    .returning({ organizationId: impersonationLogs.organizationId });

  for (const { organizationId } of ended) {
    await logAdminAction(admin.id, "impersonate_stop", { type: "organization", id: organizationId });
  }

  const [ownOrganization] = await db
    .select({ id: organization.id })
    .from(member)
    .innerJoin(organization, eq(member.organizationId, organization.id))
    .where(eq(member.userId, admin.id))
    .limit(1);

  if (!ownOrganization) return;

  // Admin já é member de verdade da própria org — sem truque de member temporário aqui.
  await auth.api.setActiveOrganization({
    headers: await headers(),
    body: { organizationId: ownOrganization.id },
  });
}

/** Organização (se houver) que esta sessão específica está impersonando agora. */
export async function getActiveImpersonation(sessionId: string, organizationId: string) {
  const [row] = await db
    .select({ id: impersonationLogs.id })
    .from(impersonationLogs)
    .where(
      and(
        eq(impersonationLogs.sessionId, sessionId),
        eq(impersonationLogs.organizationId, organizationId),
        isNull(impersonationLogs.endedAt),
      ),
    )
    .limit(1);

  return row ?? null;
}
