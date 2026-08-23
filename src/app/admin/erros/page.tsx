import { ShieldCheck } from "lucide-react";
import type { Metadata } from "next";

import { EmptyState } from "@/components/ui/empty-state";
import { CodeChip } from "@/components/ui/misc";
import { PageHeader, PageShell } from "@/components/ui/page-shell";
import { formatarDataHora } from "@/lib/format";
import { listRecentErrorLogs } from "@/server/admin/queries";

export const metadata: Metadata = { title: "Erros" };

export default async function AdminErrorsPage() {
  const errorLogs = await listRecentErrorLogs(100);

  return (
    <PageShell width="md">
      <PageHeader
        title="Erros"
        description={errorLogs.length === 0 ? "Nenhum erro registrado." : `Últimos ${errorLogs.length}.`}
      />

      {errorLogs.length === 0 ? (
        <EmptyState
          icon={<ShieldCheck size={20} />}
          title="Nada por aqui — bom sinal"
          description="Erros de servidor capturados pelo log aparecem nesta lista."
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {errorLogs.map((log) => (
            <li key={log.id} className="rounded-lg border border-app-border bg-app-surface px-3 py-2.5 text-sm">
              <div className="flex items-center justify-between gap-3">
                <CodeChip className="text-app-muted">{log.source}</CodeChip>
                <span className="shrink-0 text-xs text-app-muted">{formatarDataHora(log.createdAt)}</span>
              </div>
              <p className="mt-1 text-app-text">{log.message}</p>
              {log.organizationId && <p className="mt-0.5 text-xs text-app-muted">org: {log.organizationId}</p>}
            </li>
          ))}
        </ul>
      )}
    </PageShell>
  );
}
