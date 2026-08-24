import { LayoutGrid } from "lucide-react";
import type { Metadata } from "next";

import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader, PageShell } from "@/components/ui/page-shell";
import { requireOrganization } from "@/server/auth/session";
import { createFunnelAction } from "@/server/funnels/actions";
import { listFunnels } from "@/server/funnels/queries";

import { CreateFunnelDialog } from "./create-funnel-dialog";
import { FunnelsBoard } from "./funnels-board";

export const metadata: Metadata = { title: "Meus funis" };

export default async function FunisPage() {
  const { organization } = await requireOrganization();
  const items = await listFunnels(organization.id);

  return (
    <PageShell>
      <PageHeader title="Meus funis" action={<CreateFunnelDialog action={createFunnelAction} />} />

      {items.length === 0 ? (
        <EmptyState
          icon={<LayoutGrid size={20} />}
          title="Seu primeiro funil começa com uma tela"
          description="Descreva o que você vende e deixe o copiloto montar o rascunho, ou comece do zero e construa tela por tela."
        />
      ) : (
        <FunnelsBoard items={items} />
      )}
    </PageShell>
  );
}
