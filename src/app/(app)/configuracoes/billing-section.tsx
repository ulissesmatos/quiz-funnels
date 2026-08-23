"use client";

import { Loader2 } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { startSubscriptionCheckoutAction } from "@/server/billing/actions";

const RÓTULO_STATUS: Record<string, { texto: string; tom: "neutro" | "sucesso" | "alerta" | "erro" }> = {
  trialing: { texto: "Em teste", tom: "neutro" },
  active: { texto: "Ativa", tom: "sucesso" },
  past_due: { texto: "Pagamento pendente", tom: "erro" },
  canceled: { texto: "Cancelada", tom: "erro" },
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
    <section className="mb-6 rounded-2xl border border-app-border bg-app-surface p-5">
      <h2 className="font-medium">Assinatura</h2>
      <p className="mt-1 text-sm text-app-muted">
        Plano único, {priceLabel}/mês. Em atraso, a edição dos seus funis fica bloqueada — o que já está publicado
        continua no ar normalmente.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {rótulo && (
          <span
            className={cn(
              "rounded-full px-2.5 py-1 text-xs",
              rótulo.tom === "sucesso" && "bg-app-success/15 text-app-success",
              rótulo.tom === "erro" && "bg-app-danger/15 text-app-danger",
              rótulo.tom === "neutro" && "bg-app-surface-2 text-app-muted",
            )}
          >
            {rótulo.texto}
          </span>
        )}

        {status === "trialing" && trialEndsAt && (
          <span className="text-sm text-app-muted">
            expira em {formatarData(trialEndsAt)}
          </span>
        )}
        {status === "active" && currentPeriodEnd && (
          <span className="text-sm text-app-muted">próxima cobrança em {formatarData(currentPeriodEnd)}</span>
        )}
      </div>

      {erro && <p className="mt-3 text-xs text-app-danger">{erro}</p>}

      <div className="mt-4">
        <Button size="sm" onClick={assinar} disabled={pending}>
          {pending ? (
            <Loader2 size={14} className="animate-spin" />
          ) : bloqueado ? (
            "Atualizar pagamento"
          ) : status === "active" ? (
            "Trocar cartão"
          ) : (
            "Assinar agora"
          )}
        </Button>
      </div>
    </section>
  );
}

function formatarData(data: Date): string {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).format(data);
}
