import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { TrackedFunnelView } from "@/funnel/render/tracked-funnel-view";
import { parseFunnelDocument } from "@/funnel/schema";
import { customFontFaces, googleFontsHref } from "@/funnel/theme/css";
import { coresDoPreset } from "@/funnel/theme/presets";
import { siteUrl } from "@/lib/site";
import { getPublishedFunnelBySlug } from "@/server/funnels/queries";
import { getPublicKeyForFunnel } from "@/server/mercadopago/connections";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const published = await getPublishedFunnelBySlug(slug);

  if (!published) return { title: "Funil não encontrado" };

  const { document: doc } = published;
  const seo = doc.settings.seo;
  const firstStepSeo = doc.steps[0]?.seo;

  const title = firstStepSeo?.title ?? seo.title ?? doc.name;
  const description = firstStepSeo?.description ?? seo.description;

  return {
    title,
    description,
    alternates: { canonical: `/f/${slug}` },
    robots: seo.noindex ? { index: false, follow: false } : undefined,
    icons: seo.faviconUrl ? { icon: seo.faviconUrl } : undefined,
    openGraph: {
      title,
      description,
      url: `/f/${slug}`,
      type: "website",
      siteName: "FunilQuiz",
      locale: "pt_BR",
      images: [
        seo.imageUrl
          ? { url: seo.imageUrl }
          : {
              url: new URL("/opengraph-image", siteUrl()).toString(),
              width: 1200,
              height: 630,
              alt: "FunilQuiz — construtor de funis interativos",
            },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [seo.imageUrl ?? new URL("/twitter-image", siteUrl()).toString()],
    },
  };
}

export default async function FunnelPublicPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const published = await getPublishedFunnelBySlug(slug);
  if (!published) notFound();

  // O documento veio do banco, mas foi gravado por uma versão anterior do
  // código. Validar aqui evita servir uma tela quebrada em produção.
  const parsed = parseFunnelDocument(published.document);
  if (!parsed.success) notFound();

  const doc = parsed.data;
  const query = await searchParams;
  const fontsHref = googleFontsHref(doc.theme);
  const fontFaces = customFontFaces(doc.theme);
  const mercadoPagoPublicKey = await getPublicKeyForFunnel(published.funnelId);

  // Igual ao `.fn-root` em `autoThemeCss`: no automático o fundo do body
  // também precisa da media query, senão ele fica preso na cor de reserva
  // enquanto o conteúdo do funil já trocou.
  const corDoBody =
    doc.theme.mode === "auto"
      ? `body{background:${coresDoPreset(doc.theme.presetId, "dark").bg};}` +
        `@media (prefers-color-scheme: light){body{background:${coresDoPreset(doc.theme.presetId, "light").bg};}}`
      : `body{background:${doc.theme.colors.bg};}`;

  return (
    <>
      {fontsHref && (
        <>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
          <link rel="stylesheet" href={fontsHref} />
        </>
      )}

      {/* O `body` vem do layout raiz com o tema escuro do app; aqui ele passa a
          acompanhar o tema do funil, senão as bordas de overscroll destoam. */}
      <style>{`${corDoBody}${fontFaces}`}</style>

      <TrackedFunnelView
        document={doc}
        funnelId={published.funnelId}
        funnelVersionId={published.versionId}
        searchParams={query}
        mercadoPagoPublicKey={mercadoPagoPublicKey ?? undefined}
      />
    </>
  );
}
