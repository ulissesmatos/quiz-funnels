import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Card, CardHeader } from "@/components/ui/card";
import { PageHeader, PageShell } from "@/components/ui/page-shell";
import { getPlanDetail } from "@/server/admin/plans";

import { DeletePlanButton } from "./delete-plan-button";
import { PlanForm } from "../plan-form";

export const metadata: Metadata = { title: "Editar plano" };

export default async function EditPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const plano = await getPlanDetail(id);
  if (!plano) notFound();

  return (
    <PageShell width="sm">
      <Link
        href="/admin/planos"
        className="mb-4 flex items-center gap-1.5 text-sm text-app-muted hover:text-app-text"
      >
        <ArrowLeft size={14} />
        Planos
      </Link>

      <PageHeader
        title={plano.name}
        description={`${plano.subscriberCount} ${plano.subscriberCount === 1 ? "organização assina" : "organizações assinam"} este plano.`}
      />

      <div className="flex flex-col gap-6">
        <Card>
          <PlanForm plano={plano} />
        </Card>

        <Card>
          <CardHeader
            title="Excluir plano"
            description="Só é possível excluir um plano sem nenhuma organização assinando nele — desative em vez de excluir se ainda tiver assinantes."
          />
          <DeletePlanButton planId={plano.id} subscriberCount={plano.subscriberCount} />
        </Card>
      </div>
    </PageShell>
  );
}
