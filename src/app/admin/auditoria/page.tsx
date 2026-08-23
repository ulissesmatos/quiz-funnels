import { ScrollText } from "lucide-react";
import type { Metadata } from "next";

import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader, PageShell } from "@/components/ui/page-shell";
import { Pagination } from "@/components/ui/pagination";
import { formatarDataHora } from "@/lib/format";
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
    <PageShell width="md">
      <PageHeader
        title="Auditoria"
        description={`${total} ${total === 1 ? "ação registrada" : "ações registradas"} — trilha somente leitura de tudo que um super admin faz.`}
      />

      {items.length === 0 ? (
        <EmptyState
          icon={<ScrollText size={20} />}
          title="Nenhuma ação registrada ainda"
          description="Impersonate, ajuste de assinatura e mudança de super admin aparecem aqui."
        />
      ) : (
        <>
          <ul className="flex flex-col gap-2">
            {items.map((entry) => (
              <AuditRow key={entry.id} entry={entry} />
            ))}
          </ul>

          <Pagination page={page} totalPages={totalPages} construirHref={(p) => `?page=${p}`} />
        </>
      )}
    </PageShell>
  );
}

function AuditRow({ entry }: { entry: AuditLogRow }) {
  return (
    <li className="rounded-lg border border-app-border bg-app-surface px-3 py-2.5 text-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-app-text">
          <strong>{entry.actorName}</strong> {RÓTULO_AÇÃO[entry.action] ?? entry.action}
        </p>
        <span className="shrink-0 text-xs text-app-muted">{formatarDataHora(entry.createdAt)}</span>
      </div>
      <p className="mt-0.5 text-xs text-app-muted">
        {entry.actorEmail} · {RÓTULO_ALVO[entry.targetType] ?? entry.targetType} {entry.targetId}
      </p>
    </li>
  );
}
