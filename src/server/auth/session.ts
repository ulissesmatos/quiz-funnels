import "server-only";

import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

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
};

/**
 * Organização em que o usuário está operando. Usa a org ativa da sessão e cai
 * na primeira da qual ele é membro — todo usuário ganha uma no cadastro, então
 * na prática isso nunca fica vazio.
 */
export const getActiveOrganization = cache(async (): Promise<ActiveOrganization | null> => {
  const session = await getSession();
  if (!session) return null;

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

  const activeId = session.session.activeOrganizationId;
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
