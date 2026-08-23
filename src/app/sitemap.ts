import type { MetadataRoute } from "next";

import { parseFunnelDocument } from "@/funnel/schema";
import { siteUrl } from "@/lib/site";
import { listPublishedFunnelsForSitemap } from "@/server/funnels/queries";

/**
 * O conteúdo é gerenciado pelos clientes e muda ao publicar; por isso o XML
 * é montado por requisição, filtrando tanto documentos inválidos quanto os
 * funis que o próprio criador marcou como noindex.
 */
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const funnels = await listPublishedFunnelsForSitemap();
  const baseUrl = siteUrl();

  const paginasEstaticas: MetadataRoute.Sitemap = [
    { url: baseUrl.toString(), changeFrequency: "monthly", priority: 1 },
  ];

  return paginasEstaticas.concat(
    funnels.flatMap(({ slug, updatedAt, document }) => {
      const parsed = parseFunnelDocument(document);
      if (!parsed.success || parsed.data.settings.seo.noindex) return [];

      return [
        {
          url: new URL(`/f/${slug}`, baseUrl).toString(),
          lastModified: updatedAt,
          changeFrequency: "weekly" as const,
          priority: 0.7,
        },
      ];
    }),
  );
}
