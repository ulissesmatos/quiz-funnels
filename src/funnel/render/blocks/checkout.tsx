"use client";

import { initMercadoPago, Payment } from "@mercadopago/sdk-react";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import type { PropsOf } from "../../schema/block";
import { useFunnelRuntime } from "../runtime-context";

type PixData = { qrCode: string; qrCodeBase64?: string };

const POLL_INTERVAL_MS = 4000;

export function CheckoutBlock({ props, blockId }: { props: PropsOf<"checkout">; blockId: string }) {
  const { runAction, mode, tracking, mercadoPagoPublicKey, lastOrderId } = useFunnelRuntime();

  const precoFormatado = formatarReais(props.amountCents);

  // Editor: nunca carrega o SDK de pagamento de verdade — só um resumo.
  // Funil publicado sem conexão: mesma tela, mensagem diferente.
  if (mode === "editor" || !tracking) {
    return (
      <div className="fn-checkout fn-checkout-preview">
        <p className="fn-checkout-title">{props.title}</p>
        {props.description && <p className="fn-checkout-desc">{props.description}</p>}
        <p className="fn-checkout-price">{precoFormatado}</p>
        <p className="fn-checkout-aviso">O formulário de pagamento real aparece só no funil publicado.</p>
      </div>
    );
  }

  if (!mercadoPagoPublicKey) {
    return (
      <div className="fn-checkout fn-checkout-preview">
        <p className="fn-checkout-title">{props.title}</p>
        <p className="fn-checkout-price">{precoFormatado}</p>
        <p className="fn-checkout-aviso">Este funil ainda não está pronto para receber pagamento.</p>
      </div>
    );
  }

  return (
    <CheckoutForm
      props={props}
      blockId={blockId}
      funnelId={tracking.funnelId}
      sessionId={tracking.sessionId()}
      publicKey={mercadoPagoPublicKey}
      onSuccess={() => runAction(props.onSuccess)}
      onOrderCreated={(orderId) => lastOrderId?.set(orderId)}
    />
  );
}

function CheckoutForm({
  props,
  blockId,
  funnelId,
  sessionId,
  publicKey,
  onSuccess,
  onOrderCreated,
}: {
  props: PropsOf<"checkout">;
  blockId: string;
  funnelId: string;
  sessionId: string;
  publicKey: string;
  onSuccess: () => void;
  onOrderCreated: (orderId: string) => void;
}) {
  const [coupon, setCoupon] = useState("");
  const [couponAplicado, setCouponAplicado] = useState<{ code: string; discountCents: number } | null>(null);
  const [couponErro, setCouponErro] = useState<string | null>(null);
  const [aplicandoCoupon, setAplicandoCoupon] = useState(false);
  const [bumpMarcado, setBumpMarcado] = useState(false);

  const [erroPagamento, setErroPagamento] = useState<string | null>(null);
  const [aguardando, setAguardando] = useState<{ orderId: string; pix?: PixData; ticketUrl?: string } | null>(null);
  const [aprovado, setAprovado] = useState(false);

  useEffect(() => {
    initMercadoPago(publicKey);
  }, [publicKey]);

  // Polling de PIX/boleto: para de vez em quando pra conferir se o webhook já
  // confirmou o pagamento — o QR code aprovado não avisa a página sozinho.
  // `aguardando` só é setado uma vez (null -> valor) e nunca mais muda
  // enquanto este efeito roda, então capturá-lo no fechamento aqui é seguro —
  // não precisa de ref pra isso.
  useEffect(() => {
    if (!aguardando) return;
    const orderId = aguardando.orderId;

    const intervalo = setInterval(async () => {
      try {
        const response = await fetch(`/api/checkout/status?orderId=${orderId}`);
        const data = (await response.json()) as { status?: string };
        if (data.status === "approved") {
          setAprovado(true);
          setAguardando(null);
          onSuccess();
        }
      } catch {
        // Rede instável — tenta de novo no próximo tick, sem travar a espera.
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(intervalo);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só reinicia quando `aguardando` liga/desliga, não a cada objeto novo
  }, [Boolean(aguardando)]);

  const bumpAmountCents = bumpMarcado ? (props.bump?.amountCents ?? 0) : 0;
  const amountCents = props.amountCents + bumpAmountCents - (couponAplicado?.discountCents ?? 0);

  async function aplicarCupom() {
    setAplicandoCoupon(true);
    setCouponErro(null);

    const { applyCouponAction } = await import("@/server/coupons/actions");
    const result = await applyCouponAction(funnelId, coupon, props.amountCents);

    setAplicandoCoupon(false);
    if (!result.ok) {
      setCouponErro(result.error);
      return;
    }
    setCouponAplicado({ code: result.coupon.code, discountCents: result.discountCents });
  }

  async function onSubmit({ formData }: { formData: unknown }): Promise<void> {
    setErroPagamento(null);

    const response = await fetch("/api/checkout/pay", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        funnelId,
        sessionId,
        blockId,
        couponCode: couponAplicado?.code,
        includeBump: bumpMarcado,
        formData: formData as Record<string, unknown>,
      }),
    });

    const result = (await response.json()) as {
      ok: boolean;
      error?: string;
      orderId?: string;
      status?: string;
      pix?: PixData;
      ticketUrl?: string;
    };

    if (!result.ok || !result.orderId) {
      const mensagem = result.error ?? "Não foi possível processar o pagamento.";
      setErroPagamento(mensagem);
      throw new Error(mensagem); // o Brick usa o reject pra voltar ao estado normal do formulário
    }

    onOrderCreated(result.orderId);

    if (result.status === "approved") {
      setAprovado(true);
      onSuccess();
      return;
    }

    // PIX e boleto não aprovam na hora — mostra o meio de pagamento e espera o webhook.
    setAguardando({ orderId: result.orderId, pix: result.pix, ticketUrl: result.ticketUrl });
  }

  if (aprovado) {
    return (
      <div className="fn-checkout fn-checkout-sucesso">
        <p className="fn-checkout-title">Pagamento aprovado!</p>
      </div>
    );
  }

  if (aguardando?.pix) {
    return <PixEspera pix={aguardando.pix} />;
  }

  if (aguardando?.ticketUrl) {
    return <BoletoEspera url={aguardando.ticketUrl} />;
  }

  return (
    <div className="fn-checkout">
      <p className="fn-checkout-title">{props.title}</p>
      {props.description && <p className="fn-checkout-desc">{props.description}</p>}

      <p className="fn-checkout-price">
        {couponAplicado && <s className="fn-checkout-price-riscado">{formatarReais(props.amountCents)}</s>}
        {formatarReais(amountCents)}
      </p>

      {props.bump && (
        <label className="fn-checkout-bump">
          <input
            type="checkbox"
            checked={bumpMarcado}
            onChange={(e) => setBumpMarcado(e.target.checked)}
          />
          <span className="fn-checkout-bump-corpo">
            <span className="fn-checkout-bump-titulo">
              {props.bump.title} <strong>+ {formatarReais(props.bump.amountCents)}</strong>
            </span>
            {props.bump.description && (
              <span className="fn-checkout-bump-desc">{props.bump.description}</span>
            )}
          </span>
        </label>
      )}

      {props.allowCoupon && !couponAplicado && (
        <div className="fn-checkout-cupom">
          <input
            className="fn-input"
            value={coupon}
            onChange={(e) => setCoupon(e.target.value)}
            placeholder="Cupom de desconto"
          />
          <button
            type="button"
            className="fn-checkout-cupom-botao"
            onClick={() => void aplicarCupom()}
            disabled={aplicandoCoupon || !coupon.trim()}
          >
            {aplicandoCoupon ? <Loader2 size={14} className="fn-spin" /> : "Aplicar"}
          </button>
        </div>
      )}
      {couponErro && <p className="fn-field-error">{couponErro}</p>}
      {couponAplicado && <p className="fn-checkout-cupom-ok">Cupom {couponAplicado.code} aplicado.</p>}

      {erroPagamento && (
        <p className="fn-field-error" role="alert">
          {erroPagamento}
        </p>
      )}

      <Payment
        key={amountCents}
        initialization={{ amount: amountCents / 100 }}
        customization={{ paymentMethods: { creditCard: "all", bankTransfer: "all", ticket: "all" } }}
        onSubmit={onSubmit}
      />
    </div>
  );
}

function PixEspera({ pix }: { pix: PixData }) {
  return (
    <div className="fn-checkout fn-checkout-espera">
      <p className="fn-checkout-title">Escaneie o QR code para pagar com PIX</p>
      {pix.qrCodeBase64 && (
        <img className="fn-checkout-pix-qr" src={`data:image/png;base64,${pix.qrCodeBase64}`} alt="QR code do PIX" />
      )}
      <p className="fn-checkout-desc">Ou copie o código:</p>
      <code className="fn-checkout-pix-codigo">{pix.qrCode}</code>
      <p className="fn-checkout-aviso">
        <Loader2 size={13} className="fn-spin" /> Aguardando confirmação do pagamento…
      </p>
    </div>
  );
}

function BoletoEspera({ url }: { url: string }) {
  return (
    <div className="fn-checkout fn-checkout-espera">
      <p className="fn-checkout-title">Seu boleto foi gerado</p>
      <a className="fn-checkout-cupom-botao" href={url} target="_blank" rel="noreferrer">
        Ver boleto
      </a>
      <p className="fn-checkout-aviso">
        <Loader2 size={13} className="fn-spin" /> A confirmação pode levar até alguns dias úteis após o pagamento.
      </p>
    </div>
  );
}

function formatarReais(cents: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}
