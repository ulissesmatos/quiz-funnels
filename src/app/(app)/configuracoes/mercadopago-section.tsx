"use client";

import { Loader2 } from "lucide-react";
import { useTransition } from "react";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
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
    <Card>
      <CardHeader
        title="Mercado Pago"
        description="Conecte sua própria conta pra receber PIX, boleto e cartão direto no seu bolso — o dinheiro nunca passa pela nossa conta. É o que o bloco de Checkout usa pra cobrar dentro do funil."
      />

      {mensagem && (
        <Alert tone={mensagem.tipo === "sucesso" ? "success" : "danger"} className="mb-4">
          {mensagem.texto}
        </Alert>
      )}

      {connected ? (
        <div className="flex items-center gap-3">
          <Badge tone="success" size="md" dot>
            Conectado{!liveMode && " · modo teste"}
          </Badge>
          <Button size="sm" variant="outline" onClick={desconectar} disabled={pending}>
            {pending ? <Loader2 size={14} className="animate-spin" /> : "Desconectar"}
          </Button>
        </div>
      ) : (
        <a href="/api/mercadopago/connect">
          <Button size="sm">Conectar Mercado Pago</Button>
        </a>
      )}
    </Card>
  );
}
