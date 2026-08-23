import "server-only";

import { and, eq, isNotNull } from "drizzle-orm";

import { db } from "@/server/db";
import { funnelDomains, funnels } from "@/server/db/schema";

export type FunnelDomainListItem = {
  id: string;
  hostname: string;
  verificationToken: string;
  verifiedAt: Date | null;
  createdAt: Date;
};

export async function listFunnelDomains(funnelId: string): Promise<FunnelDomainListItem[]> {
  return db
    .select({
      id: funnelDomains.id,
      hostname: funnelDomains.hostname,
      verificationToken: funnelDomains.verificationToken,
      verifiedAt: funnelDomains.verifiedAt,
      createdAt: funnelDomains.createdAt,
    })
    .from(funnelDomains)
    .where(eq(funnelDomains.funnelId, funnelId));
}

/**
 * Usado pelo proxy (`src/proxy.ts`) — resolve hostname para o slug do funil,
 * só quando o domínio já passou pela verificação de DNS.
 */
export async function getVerifiedFunnelSlugByHostname(hostname: string): Promise<string | null> {
  const [row] = await db
    .select({ slug: funnels.slug })
    .from(funnelDomains)
    .innerJoin(funnels, eq(funnelDomains.funnelId, funnels.id))
    .where(and(eq(funnelDomains.hostname, hostname), isNotNull(funnelDomains.verifiedAt)))
    .limit(1);

  return row?.slug ?? null;
}
