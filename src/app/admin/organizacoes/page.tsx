import type { Metadata } from "next";
import Link from "next/link";

import { listOrganizationsForAdmin, type AdminOrganizationRow } from "@/server/admin/organizations";

export const metadata: Metadata = { title: "Organizações" };

const RÓTULO_STATUS: Record<string, { texto: string; classe: string }> = {
  trialing: { texto: "Em teste", classe: "bg-app-surface-2 text-app-muted" },
  active: { texto: "Ativa", classe: "bg-app-success/15 text-app-success" },
  past_due: { texto: "Pendente", classe: "bg-app-danger/15 text-app-danger" },
  canceled: { texto: "Cancelada", classe: "bg-app-danger/15 text-app-danger" },
};

const STATUS_OPTIONS = [
  { value: "", label: "Todos os status" },
  { value: "trialing", label: "Em teste" },
  { value: "active", label: "Ativa" },
  { value: "past_due", label: "Pendente" },
  { value: "canceled", label: "Cancelada" },
] as const;

type PageProps = { searchParams: Promise<{ busca?: string; status?: string }> };

export default async function AdminOrganizationsPage({ searchParams }: PageProps) {
  const { busca, status } = await searchParams;

  const organizations = await listOrganizationsForAdmin({
    search: busca || undefined,
    status: isValidStatus(status) ? status : undefined,
  });

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 md:px-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Organizações</h1>
          <p className="mt-1 text-sm text-app-muted">
            {organizations.length} {organizations.length === 1 ? "resultado" : "resultados"}.
          </p>
        </div>

        <form className="flex flex-wrap items-center gap-2" action="/admin/organizacoes">
          <input
            type="search"
            name="busca"
            defaultValue={busca}
            placeholder="Buscar por nome ou slug"
            className="h-9 rounded-lg border border-app-border bg-app-surface px-3 text-sm text-app-text placeholder:text-app-muted focus:border-app-primary focus:outline-none"
          />
          <select
            name="status"
            defaultValue={status ?? ""}
            className="h-9 rounded-lg border border-app-border bg-app-surface px-3 text-sm text-app-text focus:border-app-primary focus:outline-none"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="h-9 rounded-lg border border-app-border px-3 text-sm text-app-text hover:border-app-primary/60"
          >
            Filtrar
          </button>
        </form>
      </header>

      <div className="overflow-x-auto rounded-2xl border border-app-border">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-app-border bg-app-surface-2 text-xs text-app-muted">
              <th className="px-4 py-2.5 font-medium">Organização</th>
              <th className="px-4 py-2.5 font-medium">Assinatura</th>
              <th className="px-4 py-2.5 font-medium">Criada em</th>
            </tr>
          </thead>
          <tbody>
            {organizations.map((org) => (
              <OrganizationRow key={org.id} org={org} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function OrganizationRow({ org }: { org: AdminOrganizationRow }) {
  const rótulo = org.subscriptionStatus ? RÓTULO_STATUS[org.subscriptionStatus] : null;

  return (
    <tr className="border-b border-app-border last:border-0 hover:bg-app-surface-2/50">
      <td className="px-4 py-3 align-top">
        <Link href={`/admin/organizacoes/${org.id}`} className="text-app-text hover:underline">
          {org.name}
        </Link>
        <p className="text-xs text-app-muted">{org.slug}</p>
      </td>
      <td className="px-4 py-3 align-top">
        {rótulo ? (
          <span className={`rounded-full px-2 py-0.5 text-xs whitespace-nowrap ${rótulo.classe}`}>
            {rótulo.texto}
          </span>
        ) : (
          <span className="text-app-muted">—</span>
        )}
      </td>
      <td className="px-4 py-3 align-top whitespace-nowrap text-app-muted">{formatarData(org.createdAt)}</td>
    </tr>
  );
}

function isValidStatus(value: string | undefined): value is "trialing" | "active" | "past_due" | "canceled" {
  return value === "trialing" || value === "active" || value === "past_due" || value === "canceled";
}

function formatarData(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}
