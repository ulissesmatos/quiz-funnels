import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Card } from "@/components/ui/card";
import { PageHeader, PageShell } from "@/components/ui/page-shell";

import { PlanForm } from "../plan-form";

export const metadata: Metadata = { title: "Novo plano" };

export default function NewPlanPage() {
  return (
    <PageShell width="sm">
      <Link
        href="/admin/planos"
        className="mb-4 flex items-center gap-1.5 text-sm text-app-muted hover:text-app-text"
      >
        <ArrowLeft size={14} />
        Planos
      </Link>

      <PageHeader title="Novo plano" description="Fica disponível na página de checkout assim que criado, se marcado como ativo." />

      <Card>
        <PlanForm />
      </Card>
    </PageShell>
  );
}
