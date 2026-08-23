import { BarChart3, ExternalLink, LayoutGrid } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader, PageShell } from "@/components/ui/page-shell";
import { formatarData } from "@/lib/format";
import { requireOrganization } from "@/server/auth/session";
import { createFunnelAction } from "@/server/funnels/actions";
import { listFunnels } from "@/server/funnels/queries";

import { CreateFunnelDialog } from "./create-funnel-dialog";

export const metadata: Metadata = { title: "Meus funis" };

export default async function FunisPage() {
  const { organization } = await requireOrganization();
  const items = await listFunnels(organization.id);

  return (
    <PageShell>
      <PageHeader
        title="Meus funis"
        description={
          items.length === 0
            ? "Nenhum funil ainda. Crie o primeiro abaixo."
            : `${items.length} ${items.length === 1 ? "funil" : "funis"} nesta organização.`
        }
        action={<CreateFunnelDialog action={createFunnelAction} />}
      />

      {items.length === 0 ? (
        <EmptyState
          icon={<LayoutGrid size={20} />}
          title="Seu primeiro funil começa com uma tela"
          description="Descreva o que você vende e deixe o copiloto montar o rascunho, ou comece do zero e construa tela por tela."
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((funnel) => (
            <li key={funnel.id}>
              <Card padding="sm" interactive className="flex h-full flex-col">
                <Link href={`/funis/${funnel.id}`} className="flex-1 rounded-lg">
                  <h2 className="font-medium">{funnel.name}</h2>
                  <p className="mt-1 text-xs text-app-muted">
                    {funnel.stepCount} {funnel.stepCount === 1 ? "tela" : "telas"} ·{" "}
                    {formatarData(funnel.updatedAt)}
                  </p>
                </Link>

                <div className="mt-4 flex items-center justify-between gap-2">
                  <Badge tone={funnel.isPublished ? "success" : "neutral"}>
                    {funnel.isPublished ? "Publicado" : "Rascunho"}
                  </Badge>

                  <div className="flex items-center gap-3">
                    <Link
                      href={`/funis/${funnel.id}/analytics`}
                      className="flex items-center gap-1 text-xs text-app-muted hover:text-app-text"
                    >
                      Analytics <BarChart3 size={12} />
                    </Link>
                    {funnel.isPublished && (
                      <a
                        href={`/f/${funnel.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-xs text-app-muted hover:text-app-text"
                      >
                        Ver <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </PageShell>
  );
}
