import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FunnelView } from "@/funnel/render/funnel-view";
import { parseFunnelDocument } from "@/funnel/schema";
import { customFontFaces, googleFontsHref } from "@/funnel/theme/css";
import { getPublishedFunnelBySlug } from "@/server/funnels/queries";

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
    robots: seo.noindex ? { index: false, follow: false } : undefined,
    icons: seo.faviconUrl ? { icon: seo.faviconUrl } : undefined,
    openGraph: {
      title,
      description,
      images: seo.imageUrl ? [seo.imageUrl] : undefined,
      type: "website",
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
      <style>{`body{background:${doc.theme.colors.bg};}${fontFaces}`}</style>

      <FunnelView document={doc} searchParams={query} />
    </>
  );
}
