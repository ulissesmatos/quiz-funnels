import "server-only";

import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { getActiveImpersonation } from "@/server/admin/impersonation";
import { db } from "@/server/db";
import { member, organization } from "@/server/db/schema";

import { auth } from ".";

/**
 * Sessão atual, memoizada por request — várias partes da árvore (layout,
 * página, server actions) perguntam pela sessão e não faz sentido revalidar
 * o cookie em cada uma.
 */
export const getSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() });
});

export type ActiveOrganization = {
  id: string;
  name: string;
  slug: string;
  role: string;
  /** `true` quando quem está vendo isto é um super admin operando via impersonate, não um member de verdade. */
  impersonating?: boolean;
};

/**
 * Organização em que o usuário está operando. Usa a org ativa da sessão e cai
 * na primeira da qual ele é membro — todo usuário ganha uma no cadastro, então
 * na prática isso nunca fica vazio.
 *
 * Exceção: sessão em impersonate (ver `server/admin/impersonation.ts`) — aí a
 * organização ativa não é uma que o usuário é member de verdade, é a que um
 * super admin escolheu operar temporariamente. Checado primeiro porque o
 * super admin normalmente TEM sua própria org também, e sem essa checagem a
 * lógica de membership abaixo simplesmente a ignoraria.
 */
export const getActiveOrganization = cache(async (): Promise<ActiveOrganization | null> => {
  const session = await getSession();
  if (!session) return null;

  const activeId = session.session.activeOrganizationId;
  if (activeId) {
    const impersonation = await getActiveImpersonation(session.session.id, activeId);
    if (impersonation) {
      const [impersonatedOrg] = await db
        .select({ id: organization.id, name: organization.name, slug: organization.slug })
        .from(organization)
        .where(eq(organization.id, activeId))
        .limit(1);
      if (impersonatedOrg) return { ...impersonatedOrg, role: "owner", impersonating: true };
    }
  }

  const memberships = await db
    .select({
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      role: member.role,
    })
    .from(member)
    .innerJoin(organization, eq(member.organizationId, organization.id))
    .where(eq(member.userId, session.user.id));

  if (memberships.length === 0) return null;

  return memberships.find((m) => m.id === activeId) ?? memberships[0];
});

/** Para páginas do app: garante sessão e organização, ou manda para o login. */
export async function requireOrganization() {
  const session = await getSession();
  if (!session) redirect("/entrar");

  const org = await getActiveOrganization();
  if (!org) redirect("/entrar");

  return { session, organization: org };
}

/** Para o painel `/admin`: garante sessão de um operador do SaaS (cross-org), ou manda para o login. */
export async function requireSuperAdmin() {
  const session = await getSession();
  if (!session || !session.user.isSuperAdmin) redirect("/entrar");

  return session;
}
