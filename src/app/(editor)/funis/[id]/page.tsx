import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { EditorShell } from "@/editor/editor-shell";
import { parseFunnelDocument } from "@/funnel/schema";
import { requireOrganization } from "@/server/auth/session";
import { getFunnelForOrganization } from "@/server/funnels/queries";

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const { organization } = await requireOrganization();
  const funnel = await getFunnelForOrganization(id, organization.id);

  return { title: funnel ? `Editar ${funnel.name}` : "Funil não encontrado" };
}

export default async function EditorPage({ params }: PageProps) {
  const { id } = await params;
  const { organization } = await requireOrganization();

  const funnel = await getFunnelForOrganization(id, organization.id);
  if (!funnel) notFound();

  // Documento gravado por uma versão anterior do schema abriria o editor num
  // estado inconsistente; melhor recusar do que deixar o autosave sobrescrever
  // com algo pela metade.
  const parsed = parseFunnelDocument(funnel.document);
  if (!parsed.success) notFound();

  return <EditorShell funnelId={funnel.id} document={parsed.data} />;
}
