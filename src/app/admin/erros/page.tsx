import type { Metadata } from "next";

import { listRecentErrorLogs } from "@/server/admin/queries";

export const metadata: Metadata = { title: "Erros" };

export default async function AdminErrorsPage() {
  const errorLogs = await listRecentErrorLogs(100);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 md:px-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Erros</h1>
        <p className="mt-1 text-sm text-app-muted">
          {errorLogs.length === 0 ? "Nenhum erro registrado." : `Últimos ${errorLogs.length}.`}
        </p>
      </header>

      {errorLogs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-app-border px-6 py-16 text-center">
          <p className="text-app-muted">Nada por aqui — bom sinal.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {errorLogs.map((log) => (
            <li key={log.id} className="rounded-lg border border-app-border bg-app-surface px-3 py-2.5 text-sm">
              <div className="flex items-center justify-between gap-3">
                <code className="rounded bg-app-surface-2 px-1.5 py-0.5 text-xs text-app-muted">{log.source}</code>
                <span className="shrink-0 text-xs text-app-muted">{formatarData(log.createdAt)}</span>
              </div>
              <p className="mt-1 text-app-text">{log.message}</p>
              {log.organizationId && <p className="mt-0.5 text-xs text-app-muted">org: {log.organizationId}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function formatarData(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(
    date,
  );
}
