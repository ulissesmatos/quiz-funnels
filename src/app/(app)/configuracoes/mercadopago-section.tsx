"use client";

import { Check, Loader2 } from "lucide-react";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { disconnectMercadoPagoAction } from "@/server/mercadopago/actions";

export function MercadoPagoSection({
  connected,
  liveMode,
  mensagem,
}: {
  connected: boolean;
  liveMode: boolean;
  mensagem?: { tipo: "sucesso" | "erro"; texto: string };
}) {
  const [pending, startTransition] = useTransition();

  function desconectar() {
    startTransition(async () => {
      await disconnectMercadoPagoAction();
    });
  }

  return (
    <section className="mb-6 rounded-2xl border border-app-border bg-app-surface p-5">
      <h2 className="font-medium">Mercado Pago</h2>
      <p className="mt-1 text-sm text-app-muted">
        Conecte sua própria conta pra receber PIX, boleto e cartão direto no seu bolso — o dinheiro nunca passa
        pela nossa conta. É o que o bloco de Checkout usa pra cobrar dentro do funil.
      </p>

      {mensagem && (
        <p
          className={cn(
            "mt-3 rounded-lg px-3 py-2 text-sm",
            mensagem.tipo === "sucesso" ? "bg-app-success/10 text-app-success" : "bg-app-danger/10 text-app-danger",
          )}
        >
          {mensagem.texto}
        </p>
      )}

      <div className="mt-4">
        {connected ? (
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 rounded-full bg-app-success/15 px-2.5 py-1 text-xs text-app-success">
              <Check size={12} /> Conectado{!liveMode && " · modo teste"}
            </span>
            <Button size="sm" variant="outline" onClick={desconectar} disabled={pending}>
              {pending ? <Loader2 size={14} className="animate-spin" /> : "Desconectar"}
            </Button>
          </div>
        ) : (
          <a href="/api/mercadopago/connect">
            <Button size="sm">Conectar Mercado Pago</Button>
          </a>
        )}
      </div>
    </section>
  );
}
