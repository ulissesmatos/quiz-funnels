import "server-only";

import { and, desc, eq, ilike, or } from "drizzle-orm";

import { db } from "@/server/db";
import { member, organization, user } from "@/server/db/schema";

export type AdminUserRow = {
  id: string;
  name: string;
  email: string;
  isSuperAdmin: boolean;
  createdAt: Date;
  organizations: string[];
};

/**
 * Uma linha por usuário, com a lista de organizações agregada em memória —
 * o join sai achatado (uma linha por membership), então agrupa aqui em vez de
 * complicar a query com `array_agg` por uma lista que nunca é grande (o
 * plugin já limita a 10 orgs por usuário).
 */
export async function listUsersForAdmin(search?: string): Promise<AdminUserRow[]> {
  const conditions = [];
  if (search) conditions.push(or(ilike(user.name, `%${search}%`), ilike(user.email, `%${search}%`)));

  const query = db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      isSuperAdmin: user.isSuperAdmin,
      createdAt: user.createdAt,
      orgName: organization.name,
    })
    .from(user)
    .leftJoin(member, eq(member.userId, user.id))
    .leftJoin(organization, eq(organization.id, member.organizationId))
    .orderBy(desc(user.createdAt));

  const rows = conditions.length > 0 ? await query.where(and(...conditions)) : await query;

  const byId = new Map<string, AdminUserRow>();
  for (const row of rows) {
    let entry = byId.get(row.id);
    if (!entry) {
      entry = {
        id: row.id,
        name: row.name,
        email: row.email,
        isSuperAdmin: row.isSuperAdmin,
        createdAt: row.createdAt,
        organizations: [],
      };
      byId.set(row.id, entry);
    }
    if (row.orgName) entry.organizations.push(row.orgName);
  }

  return Array.from(byId.values());
}

export async function countSuperAdmins(): Promise<number> {
  const rows = await db.select({ id: user.id }).from(user).where(eq(user.isSuperAdmin, true));
  return rows.length;
}
