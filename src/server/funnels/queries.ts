import "server-only";

import { and, desc, eq } from "drizzle-orm";

import type { FunnelDocument } from "@/funnel/schema";
import { db } from "@/server/db";
import { funnels, funnelVersions } from "@/server/db/schema";

export type FunnelListItem = {
  id: string;
  slug: string;
  name: string;
  status: "draft" | "published" | "archived";
  stepCount: number;
  updatedAt: Date;
  isPublished: boolean;
};

export async function listFunnels(organizationId: string): Promise<FunnelListItem[]> {
  const rows = await db
    .select({
      id: funnels.id,
      slug: funnels.slug,
      name: funnels.name,
      status: funnels.status,
      document: funnels.document,
      updatedAt: funnels.updatedAt,
      publishedVersionId: funnels.publishedVersionId,
    })
    .from(funnels)
    .where(eq(funnels.organizationId, organizationId))
    .orderBy(desc(funnels.updatedAt));

  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    status: row.status,
    stepCount: row.document.steps.length,
    updatedAt: row.updatedAt,
    isPublished: row.publishedVersionId !== null,
  }));
}

/** Rascunho de um funil, restrito à organização — nunca busque só por id. */
export async function getFunnelForOrganization(funnelId: string, organizationId: string) {
  const [row] = await db
    .select()
    .from(funnels)
    .where(and(eq(funnels.id, funnelId), eq(funnels.organizationId, organizationId)))
    .limit(1);

  return row ?? null;
}

/**
 * Documento de uma versão publicada específica — é o que gerou os eventos de
 * telemetria daquele período, então rótulos de step/opção devem vir daqui, não
 * do rascunho atual (que pode ter mudado desde então).
 */
export async function getFunnelVersionDocument(versionId: string): Promise<FunnelDocument | null> {
  const [row] = await db
    .select({ document: funnelVersions.document })
    .from(funnelVersions)
    .where(eq(funnelVersions.id, versionId))
    .limit(1);

  return row?.document ?? null;
}

/**
 * Versão publicada de um funil pelo slug — é o que a página pública serve.
 * Rascunhos nunca aparecem aqui: editar não pode alterar o que está no ar.
 */
export async function getPublishedFunnelBySlug(slug: string): Promise<{
  funnelId: string;
  versionId: string;
  document: FunnelDocument;
} | null> {
  const [row] = await db
    .select({
      funnelId: funnels.id,
      versionId: funnelVersions.id,
      document: funnelVersions.document,
    })
    .from(funnels)
    .innerJoin(funnelVersions, eq(funnels.publishedVersionId, funnelVersions.id))
    .where(and(eq(funnels.slug, slug), eq(funnels.status, "published")))
    .limit(1);

  return row ?? null;
}

/** Dados mínimos para o sitemap — somente versões que estão no ar. */
export async function listPublishedFunnelsForSitemap(): Promise<
  Array<{ slug: string; updatedAt: Date; document: FunnelDocument }>
> {
  return db
    .select({
      slug: funnels.slug,
      updatedAt: funnels.updatedAt,
      document: funnelVersions.document,
    })
    .from(funnels)
    .innerJoin(funnelVersions, eq(funnels.publishedVersionId, funnelVersions.id))
    .where(eq(funnels.status, "published"));
}
