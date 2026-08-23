"use client";

import { Loader2 } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { extendTrialAction, setSubscriptionStatusAction } from "@/server/admin/actions";

const STATUS_OPTIONS = [
  { value: "trialing", label: "Em teste" },
  { value: "active", label: "Ativa" },
  { value: "past_due", label: "Pendente" },
  { value: "canceled", label: "Cancelada" },
] as const;

export function SubscriptionOverride({ organizationId }: { organizationId: string }) {
  const [pending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [status, setStatus] = useState<(typeof STATUS_OPTIONS)[number]["value"]>("active");
  const [dias, setDias] = useState(7);

  function aplicarStatus() {
    setErro(null);
    startTransition(async () => {
      const result = await setSubscriptionStatusAction(organizationId, status);
      if (!result.ok) setErro(result.error);
    });
  }

  function estenderTrial() {
    setErro(null);
    startTransition(async () => {
      const result = await extendTrialAction(organizationId, dias);
      if (!result.ok) setErro(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as (typeof STATUS_OPTIONS)[number]["value"])}
          className="h-9 rounded-lg border border-app-border bg-app-surface px-3 text-sm text-app-text focus:border-app-primary focus:outline-none"
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <Button size="sm" variant="outline" onClick={aplicarStatus} disabled={pending}>
          {pending ? <Loader2 size={14} className="animate-spin" /> : "Aplicar status"}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          type="number"
          min={1}
          max={90}
          value={dias}
          onChange={(e) => setDias(Number(e.target.value))}
          className="h-9 w-20 rounded-lg border border-app-border bg-app-surface px-3 text-sm text-app-text focus:border-app-primary focus:outline-none"
        />
        <span className="text-sm text-app-muted">dias de trial</span>
        <Button size="sm" variant="outline" onClick={estenderTrial} disabled={pending}>
          {pending ? <Loader2 size={14} className="animate-spin" /> : "Estender trial"}
        </Button>
      </div>

      {erro && <p className="text-xs text-app-danger">{erro}</p>}
    </div>
  );
}
