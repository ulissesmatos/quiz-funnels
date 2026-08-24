import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DataTable,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader, PageShell } from "@/components/ui/page-shell";
import { formatarPreco } from "@/lib/format";
import { listPlansForAdmin } from "@/server/admin/plans";

export const metadata: Metadata = { title: "Planos" };

export default async function AdminPlansPage() {
  const plans = await listPlansForAdmin();

  return (
    <PageShell>
      <PageHeader
        title="Planos"
        description="Nome, preço, limites e features de cada plano — nada disso é fixo no código, tudo sai daqui."
        action={
          <Link href="/admin/planos/novo">
            <Button size="sm">
              <Plus size={15} />
              Novo plano
            </Button>
          </Link>
        }
      />

      {plans.length === 0 ? (
        <EmptyState title="Nenhum plano cadastrado" description="Crie o primeiro plano pra habilitar o checkout." />
      ) : (
        <DataTable minWidth={860}>
          <TableHead>
            <tr>
              <TableHeaderCell>Plano</TableHeaderCell>
              <TableHeaderCell>Preço/mês</TableHeaderCell>
              <TableHeaderCell>Limites</TableHeaderCell>
              <TableHeaderCell>Features</TableHeaderCell>
              <TableHeaderCell>Assinantes</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
            </tr>
          </TableHead>
          <tbody>
            {plans.map((plano) => (
              <TableRow key={plano.id}>
                <TableCell>
                  <Link href={`/admin/planos/${plano.id}`} className="text-app-text hover:underline">
                    {plano.name}
                  </Link>
                  <p className="text-xs text-app-muted">{plano.slug}</p>
                </TableCell>
                <TableCell className="text-app-text tabular-nums">
                  {formatarPreco(plano.monthlyPriceCents, plano.currency)}
                </TableCell>
                <TableCell className="text-app-muted">
                  {plano.maxFunnels ?? "∞"} funis · {plano.maxLeadsPerFunnel ?? "∞"} leads/funil
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {plano.canUseTeam && <Badge tone="brand">Equipe</Badge>}
                    {plano.canUseWebhooks && <Badge tone="brand">Webhooks</Badge>}
                    {!plano.canUseTeam && !plano.canUseWebhooks && <span className="text-app-muted">—</span>}
                  </div>
                </TableCell>
                <TableCell className="text-app-text tabular-nums">{plano.subscriberCount}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {plano.featured && <Badge tone="success">Destaque</Badge>}
                    <Badge tone={plano.active ? "neutral" : "danger"}>{plano.active ? "Ativo" : "Inativo"}</Badge>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </tbody>
        </DataTable>
      )}
    </PageShell>
  );
}
