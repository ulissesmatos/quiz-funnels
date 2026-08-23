"use client";

import { useState, useTransition } from "react";

import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { formatarDataCompleta } from "@/lib/format";
import { startSubscriptionCheckoutAction } from "@/server/billing/actions";

const RÓTULO_STATUS: Record<string, { texto: string; tone: BadgeProps["tone"] }> = {
  trialing: { texto: "Em teste", tone: "neutral" },
  active: { texto: "Ativa", tone: "success" },
  past_due: { texto: "Pagamento pendente", tone: "warning" },
  canceled: { texto: "Cancelada", tone: "danger" },
};

export function BillingSection({
  status,
  trialEndsAt,
  currentPeriodEnd,
  priceLabel,
}: {
  status: "trialing" | "active" | "past_due" | "canceled" | null;
  trialEndsAt: Date | null;
  currentPeriodEnd: Date | null;
  priceLabel: string;
}) {
  const [pending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  const rótulo = status ? RÓTULO_STATUS[status] : null;
  const bloqueado = status === "past_due" || status === "canceled";

  function assinar() {
    setErro(null);
    startTransition(async () => {
      const result = await startSubscriptionCheckoutAction();
      if (!result.ok) {
        setErro(result.error);
        return;
      }
      window.location.href = result.initPoint;
    });
  }

  return (
    <Card>
      <CardHeader
        title="Assinatura"
        description={`Plano único, ${priceLabel}/mês. Em atraso, a edição dos seus funis fica bloqueada — o que já está publicado continua no ar normalmente.`}
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

      {erro && <p className="mt-3 text-xs text-app-danger">{erro}</p>}

      <div className="mt-4">
        <Button size="sm" onClick={assinar} loading={pending}>
          {bloqueado ? "Atualizar pagamento" : status === "active" ? "Trocar cartão" : "Assinar agora"}
        </Button>
      </div>
    </Card>
  );
}
