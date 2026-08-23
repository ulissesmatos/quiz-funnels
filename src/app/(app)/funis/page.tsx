import { BarChart3, ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { requireOrganization } from "@/server/auth/session";
import { createFunnelAction } from "@/server/funnels/actions";
import { listFunnels } from "@/server/funnels/queries";

import { CreateFunnelDialog } from "./create-funnel-dialog";

export const metadata: Metadata = { title: "Meus funis" };

export default async function FunisPage() {
  const { organization } = await requireOrganization();
  const items = await listFunnels(organization.id);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 md:px-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Meus funis</h1>
          <p className="mt-1 text-sm text-app-muted">
            {items.length === 0
              ? "Nenhum funil ainda. Crie o primeiro abaixo."
              : `${items.length} ${items.length === 1 ? "funil" : "funis"} nesta organização.`}
          </p>
        </div>

        <CreateFunnelDialog action={createFunnelAction} />
      </header>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-app-border px-6 py-16 text-center">
          <p className="text-app-muted">
            Um funil começa com uma tela. Toque em &ldquo;Criar funil&rdquo; acima pra começar.
          </p>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((funnel) => (
            <li key={funnel.id}>
              <div className="group flex h-full flex-col rounded-2xl border border-app-border bg-app-surface p-4 transition-colors hover:border-app-primary/50">
                <Link href={`/funis/${funnel.id}`} className="flex-1">
                  <h2 className="font-medium">{funnel.name}</h2>
                  <p className="mt-1 text-xs text-app-muted">
                    {funnel.stepCount} {funnel.stepCount === 1 ? "tela" : "telas"} ·{" "}
                    {formatarData(funnel.updatedAt)}
                  </p>
                </Link>

                <div className="mt-4 flex items-center justify-between">
                  <StatusBadge published={funnel.isPublished} />
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
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function StatusBadge({ published }: { published: boolean }) {
  return (
    <span
      className={
        published
          ? "rounded-full bg-app-success/15 px-2 py-0.5 text-xs text-app-success"
          : "rounded-full bg-app-surface-2 px-2 py-0.5 text-xs text-app-muted"
      }
    >
      {published ? "Publicado" : "Rascunho"}
    </span>
  );
}

function formatarData(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(date);
}
