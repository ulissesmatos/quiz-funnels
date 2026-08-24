import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader, PageShell } from "@/components/ui/page-shell";
import { requireOrganization } from "@/server/auth/session";
import { listActivePlans } from "@/server/billing/plans";
import { getOrganizationSubscription } from "@/server/billing/queries";

import { PlanosPicker } from "./planos-picker";

export const metadata: Metadata = { title: "Planos" };

export default async function PlanosPage() {
  const { organization } = await requireOrganization();

  const [planos, subscription] = await Promise.all([
    listActivePlans(),
    getOrganizationSubscription(organization.id),
  ]);

  return (
    <PageShell width="md">
      <Link
        href="/configuracoes"
        className="mb-4 flex items-center gap-1.5 text-sm text-app-muted hover:text-app-text"
      >
        <ArrowLeft size={14} />
        Configurações
      </Link>

      <PageHeader
        title="Planos"
        description="Cartão é melhor pra cobrança recorrente. No plano anual, pagar por Pix sai 5% mais barato — mas não renova sozinho, é preciso pagar de novo quando vencer."
      />

      <PlanosPicker planos={planos} planoAtualId={subscription?.planId ?? null} />
    </PageShell>
  );
}
