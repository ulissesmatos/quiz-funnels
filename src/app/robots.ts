import type { MetadataRoute } from "next";

import { siteUrl } from "@/lib/site";

/**
 * O painel é privado; a home (landing page) e os funis publicados podem ser
 * rastreados. Lista de disallow explícita em vez de bloquear "/" inteiro —
 * a home só é pública desde que a landing page existe.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      disallow: [
        "/api/",
        "/admin/",
        "/entrar",
        "/cadastro",
        "/funis",
        "/leads",
        "/configuracoes",
        "/equipe",
        "/convite",
      ],
    },
    sitemap: new URL("/sitemap.xml", siteUrl()).toString(),
  };
}
