"use client";

import { Trash2 } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { deletePlanAction } from "@/server/admin/plan-actions";

export function DeletePlanButton({ planId, subscriberCount }: { planId: string; subscriberCount: number }) {
  const [pending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const bloqueado = subscriberCount > 0;

  function excluir() {
    setErro(null);
    startTransition(async () => {
      const result = await deletePlanAction(planId);
      if (result && !result.ok) setErro(result.error);
    });
  }

  const botao = (
    <Button variant="danger" size="sm" onClick={excluir} disabled={bloqueado || pending} loading={pending}>
      <Trash2 size={14} />
      Excluir plano
    </Button>
  );

  return (
    <div className="flex flex-col items-start gap-2">
      {bloqueado ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <span>{botao}</span>
          </TooltipTrigger>
          <TooltipContent>
            {subscriberCount} organização{subscriberCount === 1 ? "" : "ões"} ainda {subscriberCount === 1 ? "está" : "estão"} neste plano.
          </TooltipContent>
        </Tooltip>
      ) : (
        botao
      )}
      {erro && <p className="text-xs text-app-danger">{erro}</p>}
    </div>
  );
}
