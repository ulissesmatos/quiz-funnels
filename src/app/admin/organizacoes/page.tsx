import type { Metadata } from "next";
import Link from "next/link";

import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DataTable,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/data-table";
import { Input, Select } from "@/components/ui/field";
import { PageHeader, PageShell } from "@/components/ui/page-shell";
import { formatarDataCompleta } from "@/lib/format";
import { listOrganizationsForAdmin, type AdminOrganizationRow } from "@/server/admin/organizations";

export const metadata: Metadata = { title: "Organizações" };

const RÓTULO_STATUS: Record<string, { texto: string; tone: BadgeProps["tone"] }> = {
  trialing: { texto: "Em teste", tone: "neutral" },
  active: { texto: "Ativa", tone: "success" },
  past_due: { texto: "Pendente", tone: "warning" },
  canceled: { texto: "Cancelada", tone: "danger" },
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
    <PageShell>
      <PageHeader
        title="Organizações"
        description={`${organizations.length} ${organizations.length === 1 ? "resultado" : "resultados"}.`}
        action={
          // GET puro: o filtro vive na URL, então a página segue server
          // component e o botão voltar do navegador funciona.
          <form className="flex flex-wrap items-center gap-2" action="/admin/organizacoes">
            <Input
              type="search"
              name="busca"
              defaultValue={busca}
              placeholder="Buscar por nome ou slug"
              aria-label="Buscar organização"
              className="h-9 w-56"
            />
            <Select name="status" defaultValue={status ?? ""} aria-label="Filtrar por status" className="h-9 w-44">
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            <Button type="submit" variant="outline" size="sm" className="h-9">
              Filtrar
            </Button>
          </form>
        }
      />

      <DataTable minWidth={640}>
        <TableHead>
          <tr>
            <TableHeaderCell>Organização</TableHeaderCell>
            <TableHeaderCell>Assinatura</TableHeaderCell>
            <TableHeaderCell>Criada em</TableHeaderCell>
          </tr>
        </TableHead>
        <tbody>
          {organizations.map((org) => (
            <OrganizationRow key={org.id} org={org} />
          ))}
        </tbody>
      </DataTable>
    </PageShell>
  );
}

function OrganizationRow({ org }: { org: AdminOrganizationRow }) {
  const rótulo = org.subscriptionStatus ? RÓTULO_STATUS[org.subscriptionStatus] : null;

  return (
    <TableRow>
      <TableCell>
        <Link href={`/admin/organizacoes/${org.id}`} className="text-app-text hover:underline">
          {org.name}
        </Link>
        <p className="text-xs text-app-muted">{org.slug}</p>
      </TableCell>
      <TableCell>
        {rótulo ? <Badge tone={rótulo.tone}>{rótulo.texto}</Badge> : <span className="text-app-muted">—</span>}
      </TableCell>
      <TableCell className="whitespace-nowrap text-app-muted">{formatarDataCompleta(org.createdAt)}</TableCell>
    </TableRow>
  );
}

function isValidStatus(value: string | undefined): value is "trialing" | "active" | "past_due" | "canceled" {
  return value === "trialing" || value === "active" || value === "past_due" || value === "canceled";
}
