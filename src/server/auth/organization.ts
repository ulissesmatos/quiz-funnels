import "server-only";

import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

import { slugify } from "@/lib/slug";
import { db } from "@/server/db";
import { member, organization } from "@/server/db/schema";

/**
 * Cria a organização pessoal de um usuário recém-cadastrado e o registra como
 * dono. Chamado pelo hook de criação de usuário do Better Auth, para que
 * ninguém fique num estado "logado mas sem workspace".
 */
export async function createPersonalOrganization(user: {
  id: string;
  name: string;
  email: string;
}) {
  const base = slugify(user.name || user.email.split("@")[0] || "workspace", 40) || "workspace";
  const slug = await findAvailableSlug(base);
  const now = new Date();
  const organizationId = nanoid();

  await db.insert(organization).values({
    id: organizationId,
    name: user.name || "Meu workspace",
    slug,
    createdAt: now,
  });

  await db.insert(member).values({
    id: nanoid(),
    organizationId,
    userId: user.id,
    role: "owner",
    createdAt: now,
  });

  return organizationId;
}

async function findAvailableSlug(base: string): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = attempt === 0 ? base : `${base}-${nanoid(6).toLowerCase()}`;
    const [existing] = await db
      .select({ id: organization.id })
      .from(organization)
      .where(eq(organization.slug, candidate))
      .limit(1);

    if (!existing) return candidate;
  }

  return `${base}-${nanoid(10).toLowerCase()}`;
}
