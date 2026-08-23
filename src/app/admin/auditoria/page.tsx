import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { AUDIT_LOGS_PAGE_SIZE, listAuditLogs, type AuditLogRow } from "@/server/admin/audit";

export const metadata: Metadata = { title: "Auditoria" };

const RÓTULO_AÇÃO: Record<string, string> = {
  impersonate_start: "Iniciou impersonate",
  impersonate_stop: "Encerrou impersonate",
  subscription_override: "Ajustou assinatura",
  promote_super_admin: "Promoveu a super admin",
  demote_super_admin: "Removeu super admin",
};

const RÓTULO_ALVO: Record<string, string> = { organization: "organização", user: "usuário" };

type PageProps = { searchParams: Promise<{ page?: string }> };

export default async function AdminAuditPage({ searchParams }: PageProps) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const { items, total } = await listAuditLogs(page);
  const totalPages = Math.max(1, Math.ceil(total / AUDIT_LOGS_PAGE_SIZE));

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 md:px-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Auditoria</h1>
        <p className="mt-1 text-sm text-app-muted">
          {total} {total === 1 ? "ação registrada" : "ações registradas"} — trilha somente leitura de tudo que um
          super admin faz.
        </p>
      </header>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-app-border px-6 py-16 text-center">
          <p className="text-app-muted">Nenhuma ação registrada ainda.</p>
        </div>
      ) : (
        <>
          <ul className="flex flex-col gap-2">
            {items.map((entry) => (
              <AuditRow key={entry.id} entry={entry} />
            ))}
          </ul>

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-3 text-sm">
              <PageLink page={page - 1} disabled={page <= 1}>
                Anterior
              </PageLink>
              <span className="text-app-muted">
                Página {page} de {totalPages}
              </span>
              <PageLink page={page + 1} disabled={page >= totalPages}>
                Próxima
              </PageLink>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function AuditRow({ entry }: { entry: AuditLogRow }) {
  return (
    <li className="rounded-lg border border-app-border bg-app-surface px-3 py-2.5 text-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-app-text">
          <strong>{entry.actorName}</strong> {RÓTULO_AÇÃO[entry.action] ?? entry.action}
        </p>
        <span className="shrink-0 text-xs text-app-muted">{formatarData(entry.createdAt)}</span>
      </div>
      <p className="mt-0.5 text-xs text-app-muted">
        {entry.actorEmail} · {RÓTULO_ALVO[entry.targetType] ?? entry.targetType} {entry.targetId}
      </p>
    </li>
  );
}

function PageLink({ page, disabled, children }: { page: number; disabled: boolean; children: ReactNode }) {
  if (disabled) {
    return <span className="rounded-lg border border-app-border px-3 py-1.5 text-app-muted opacity-40">{children}</span>;
  }

  return (
    <Link
      href={`?page=${page}`}
      className="rounded-lg border border-app-border px-3 py-1.5 transition-colors hover:border-app-primary/60 hover:text-app-text"
    >
      {children}
    </Link>
  );
}

function formatarData(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(
    date,
  );
}
