"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import type { PropsOf } from "../../schema/block";
import { useFunnelRuntime } from "../runtime-context";

export function UpsellBlock({ props, blockId }: { props: PropsOf<"upsell">; blockId: string }) {
  const { runAction, mode, tracking, lastOrderId } = useFunnelRuntime();

  if (mode === "editor" || !tracking) {
    return (
      <div className="fn-checkout fn-checkout-preview">
        <p className="fn-checkout-title">{props.title}</p>
        {props.description && <p className="fn-checkout-desc">{props.description}</p>}
        <p className="fn-checkout-price">{formatarReais(props.amountCents)}</p>
        <p className="fn-checkout-aviso">
          A cobrança de 1 clique acontece só no funil publicado, e só depois de uma compra aprovada no cartão.
        </p>
      </div>
    );
  }

  return (
    <UpsellForm
      props={props}
      blockId={blockId}
      funnelId={tracking.funnelId}
      sessionId={tracking.sessionId()}
      parentOrderId={lastOrderId?.get() ?? null}
      onAccept={() => runAction(props.onAccept)}
      onDecline={() => runAction(props.onDecline)}
    />
  );
}

function UpsellForm({
  props,
  blockId,
  funnelId,
  sessionId,
  parentOrderId,
  onAccept,
  onDecline,
}: {
  props: PropsOf<"upsell">;
  blockId: string;
  funnelId: string;
  sessionId: string;
  parentOrderId: string | null;
  onAccept: () => void;
  onDecline: () => void;
}) {
  // `null` = ainda checando; depois vira `true`/`false`. Sem pedido anterior
  // nesta sessão, já nasce `false` — não há o que checar no servidor.
  const [disponivel, setDisponivel] = useState<boolean | null>(() => (parentOrderId ? null : false));
  const [cobrando, setCobrando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aceito, setAceito] = useState(false);

  useEffect(() => {
    if (!parentOrderId) return;

    let cancelado = false;
    fetch(`/api/checkout/upsell-available?orderId=${parentOrderId}`)
      .then((response) => response.json())
      .then((data: { available?: boolean }) => {
        if (!cancelado) setDisponivel(Boolean(data.available));
      })
      .catch(() => {
        if (!cancelado) setDisponivel(false);
      });

    return () => {
      cancelado = true;
    };
  }, [parentOrderId]);

  // Sem 1-clique de verdade pra oferecer (PIX/boleto, ou nenhuma compra nesta
  // sessão) — pula a tela sozinho em vez de mostrar um beco sem saída.
  useEffect(() => {
    if (disponivel === false) onDecline();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só dispara na transição pra `false`, `onDecline` não deve reexecutar isto
  }, [disponivel]);

  async function aceitar() {
    if (!parentOrderId) return;
    setCobrando(true);
    setErro(null);

    try {
      const response = await fetch("/api/checkout/upsell", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ funnelId, sessionId, blockId, parentOrderId }),
      });
      const result = (await response.json()) as { ok: boolean; error?: string };

      if (!result.ok) {
        setErro(result.error ?? "Não foi possível processar a cobrança.");
        setCobrando(false);
        return;
      }

      setAceito(true);
      onAccept();
    } catch {
      setErro("Não foi possível processar a cobrança.");
      setCobrando(false);
    }
  }

  if (aceito) {
    return (
      <div className="fn-checkout fn-checkout-sucesso">
        <p className="fn-checkout-title">Adicionado com sucesso!</p>
      </div>
    );
  }

  if (!disponivel) return null; // carregando, ou indisponível (já pulando a tela)

  return (
    <div className="fn-checkout">
      <p className="fn-checkout-title">{props.title}</p>
      {props.description && <p className="fn-checkout-desc">{props.description}</p>}
      <p className="fn-checkout-price">{formatarReais(props.amountCents)}</p>

      {erro && (
        <p className="fn-field-error" role="alert">
          {erro}
        </p>
      )}

      <button
        type="button"
        className="fn-checkout-cupom-botao fn-checkout-upsell-aceitar"
        onClick={() => void aceitar()}
        disabled={cobrando}
      >
        {cobrando ? <Loader2 size={14} className="fn-spin" /> : props.acceptLabel}
      </button>

      <button type="button" className="fn-checkout-upsell-recusar" onClick={onDecline} disabled={cobrando}>
        {props.declineLabel}
      </button>
    </div>
  );
}

function formatarReais(cents: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}
