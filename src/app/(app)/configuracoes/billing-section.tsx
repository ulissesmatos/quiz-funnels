import Link from "next/link";

import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { formatarDataCompleta } from "@/lib/format";

const RÓTULO_STATUS: Record<string, { texto: string; tone: BadgeProps["tone"] }> = {
  trialing: { texto: "Em teste", tone: "neutral" },
  active: { texto: "Ativa", tone: "success" },
  past_due: { texto: "Pagamento pendente", tone: "warning" },
  canceled: { texto: "Cancelada", tone: "danger" },
};

/**
 * Resumo compacto — trocar de plano, mudar de forma de pagamento ou ver os
 * três planos lado a lado é tudo em `/configuracoes/planos`, não aqui.
 */
export function BillingSection({
  planName,
  priceLabel,
  status,
  trialEndsAt,
  currentPeriodEnd,
}: {
  planName: string | null;
  priceLabel: string | null;
  status: "trialing" | "active" | "past_due" | "canceled" | null;
  trialEndsAt: Date | null;
  currentPeriodEnd: Date | null;
}) {
  const rótulo = status ? RÓTULO_STATUS[status] : null;

  return (
    <Card>
      <CardHeader
        title="Assinatura"
        description={
          planName && priceLabel
            ? `Plano ${planName}, ${priceLabel}/mês. Em atraso, a edição dos seus funis fica bloqueada — o que já está publicado continua no ar normalmente.`
            : "Nenhum plano associado a esta organização ainda."
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        {rótulo && (
          <Badge tone={rótulo.tone} size="md">
            {rótulo.texto}
          </Badge>
        )}

        {status === "trialing" && trialEndsAt && (
          <span className="text-sm text-app-muted">expira em {formatarDataCompleta(trialEndsAt)}</span>
        )}
        {status === "active" && currentPeriodEnd && (
          <span className="text-sm text-app-muted">
            próxima cobrança em {formatarDataCompleta(currentPeriodEnd)}
          </span>
        )}
      </div>

      <div className="mt-4">
        <Link href="/configuracoes/planos">
          <Button size="sm">Ver planos</Button>
        </Link>
      </div>
    </Card>
  );
}
