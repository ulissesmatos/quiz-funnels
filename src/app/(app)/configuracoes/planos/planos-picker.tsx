"use client";

import { Check, CreditCard, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { formatarPreco } from "@/lib/format";
import {
  confirmPixPaymentAction,
  startCardCheckoutAction,
  startPixCheckoutAction,
  type Provider,
} from "@/server/billing/actions";
import { PIX_ANNUAL_DISCOUNT } from "@/server/billing/constants";
import type { BillingCycle } from "@/server/billing/subscriptions";
import type { Plan } from "@/server/db/schema";

export function PlanosPicker({ planos, planoAtualId }: { planos: Plan[]; planoAtualId: string | null }) {
  const [ciclo, setCiclo] = useState<BillingCycle>("monthly");
  const [planoParaCheckout, setPlanoParaCheckout] = useState<Plan | null>(null);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-center">
        <SegmentedControl
          items={[
            { value: "monthly", label: "Mensal" },
            { value: "annual", label: "Anual" },
          ]}
          value={ciclo}
          onChange={setCiclo}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {planos.map((plano) => (
          <PlanoCard
            key={plano.id}
            plano={plano}
            ciclo={ciclo}
            atual={plano.id === planoAtualId}
            onEscolher={() => setPlanoParaCheckout(plano)}
          />
        ))}
      </div>

      <CheckoutDialog plano={planoParaCheckout} ciclo={ciclo} onClose={() => setPlanoParaCheckout(null)} />
    </div>
  );
}

function PlanoCard({
  plano,
  ciclo,
  atual,
  onEscolher,
}: {
  plano: Plan;
  ciclo: BillingCycle;
  atual: boolean;
  onEscolher: () => void;
}) {
  const precoCents = ciclo === "annual" ? plano.monthlyPriceCents * 12 : plano.monthlyPriceCents;

  return (
    <Card padding="lg" className={plano.featured ? "border-app-primary" : undefined}>
      <div className="flex items-center gap-2">
        <h3 className="font-semibold tracking-tight">{plano.name}</h3>
        {plano.featured && <Badge tone="brand">Recomendado</Badge>}
      </div>
      {plano.description && <p className="mt-1 text-sm text-app-muted">{plano.description}</p>}

      <p className="mt-4 flex items-baseline gap-1">
        <span className="font-mono text-3xl font-bold tabular-nums">{formatarPreco(precoCents, plano.currency)}</span>
        <span className="text-sm text-app-muted">/{ciclo === "annual" ? "ano" : "mês"}</span>
      </p>
      <p className="mt-0.5 text-xs text-app-muted">{plano.trialDays} dias grátis pra testar</p>

      <ul className="mt-4 flex flex-col gap-1.5 text-sm">
        <FeatureItem texto={plano.maxFunnels ? `${plano.maxFunnels} funis` : "Funis ilimitados"} />
        <FeatureItem
          texto={plano.maxLeadsPerFunnel ? `${plano.maxLeadsPerFunnel} leads por funil` : "Leads ilimitados por funil"}
        />
        {plano.canUseTeam && <FeatureItem texto="Equipe multiusuário" />}
        {plano.canUseWebhooks && <FeatureItem texto="Webhooks" />}
      </ul>

      <div className="mt-5">
        {atual ? (
          <Button size="sm" variant="outline" disabled className="w-full">
            Seu plano atual
          </Button>
        ) : (
          <Button size="sm" onClick={onEscolher} className="w-full">
            Escolher plano
          </Button>
        )}
      </div>
    </Card>
  );
}

function FeatureItem({ texto }: { texto: string }) {
  return (
    <li className="flex items-center gap-2">
      <Check size={14} className="shrink-0 text-app-success" />
      {texto}
    </li>
  );
}

type Pendente = Provider | "pix" | null;

function CheckoutDialog({ plano, ciclo, onClose }: { plano: Plan | null; ciclo: BillingCycle; onClose: () => void }) {
  const router = useRouter();
  const [pendente, setPendente] = useState<Pendente>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pix, setPix] = useState<{ paymentId: string; qrCode: string; qrCodeBase64: string } | null>(null);

  function aoFechar(aberto: boolean) {
    if (aberto) return;
    onClose();
    setPix(null);
    setErro(null);
    setPendente(null);
  }

  async function pagarComCartao(provider: Provider) {
    if (!plano) return;
    setErro(null);
    setPendente(provider);

    const result = await startCardCheckoutAction(plano.id, ciclo, provider);

    setPendente(null);
    if (!result.ok) {
      setErro(result.error);
      return;
    }
    window.location.href = result.initPoint;
  }

  async function pagarComPix() {
    if (!plano) return;
    setErro(null);
    setPendente("pix");

    const result = await startPixCheckoutAction(plano.id);

    setPendente(null);
    if (!result.ok) {
      setErro(result.error);
      return;
    }
    setPix(result);
  }

  async function verificarPix() {
    if (!pix) return;
    setErro(null);
    setPendente("pix");

    const result = await confirmPixPaymentAction(pix.paymentId);

    setPendente(null);
    if (!result.ok) {
      setErro(result.error);
      return;
    }
    router.push("/configuracoes/planos?assinatura=confirmada");
    router.refresh();
  }

  const precoAnualComDesconto = plano ? Math.round(plano.monthlyPriceCents * 12 * (1 - PIX_ANNUAL_DISCOUNT)) : 0;

  return (
    <Dialog open={plano !== null} onOpenChange={aoFechar}>
      <DialogContent>
        {plano && (
          <>
            <DialogHeader
              title={pix ? "Pague com Pix" : `Assinar ${plano.name}`}
              description={
                pix
                  ? "Escaneie o QR code ou copie o código — a confirmação chega em poucos segundos."
                  : ciclo === "annual"
                    ? "Cobrança anual."
                    : "Cobrança mensal recorrente."
              }
            />

            {pix ? (
              <div className="flex flex-col items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`data:image/png;base64,${pix.qrCodeBase64}`}
                  alt="QR code do Pix"
                  className="h-48 w-48 rounded-lg border border-app-border"
                />
                <div className="flex w-full items-center gap-2 rounded-lg bg-app-surface-2 px-3 py-2 text-xs">
                  <span className="min-w-0 flex-1 truncate text-app-muted">{pix.qrCode}</span>
                  <CopyButton value={pix.qrCode} />
                </div>

                {erro && <p className="text-xs text-app-danger">{erro}</p>}

                <Button size="sm" className="w-full" loading={pendente === "pix"} onClick={verificarPix}>
                  Já paguei, verificar
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <OpcaoDePagamento
                  titulo="Cartão · Mercado Pago"
                  descricao="Assinatura recorrente, renova sozinha."
                  recomendado={ciclo === "monthly"}
                  loading={pendente === "mercadopago"}
                  onClick={() => pagarComCartao("mercadopago")}
                />
                <OpcaoDePagamento
                  titulo="Cartão · Stripe"
                  descricao="Assinatura recorrente, renova sozinha."
                  recomendado={false}
                  loading={pendente === "stripe"}
                  onClick={() => pagarComCartao("stripe")}
                />
                {ciclo === "annual" && (
                  <OpcaoDePagamento
                    titulo="Pix · Mercado Pago"
                    descricao={`Pagamento único, ${formatarPreco(precoAnualComDesconto, plano.currency)} (5% de desconto) — não renova sozinho.`}
                    recomendado
                    loading={pendente === "pix"}
                    onClick={pagarComPix}
                  />
                )}

                {erro && <p className="text-xs text-app-danger">{erro}</p>}
              </div>
            )}

            {!pix && (
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="ghost" size="sm">
                    Cancelar
                  </Button>
                </DialogClose>
              </DialogFooter>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function OpcaoDePagamento({
  titulo,
  descricao,
  recomendado,
  loading,
  onClick,
}: {
  titulo: string;
  descricao: string;
  recomendado: boolean;
  loading: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="flex items-center justify-between gap-3 rounded-lg border border-app-border px-3 py-2.5 text-left transition-colors duration-150 ease-app hover:border-app-primary/60 disabled:opacity-60"
    >
      <span className="min-w-0">
        <span className="flex items-center gap-1.5 text-sm font-medium">
          {titulo}
          {recomendado && (
            <Badge tone="success" size="sm">
              Recomendado
            </Badge>
          )}
        </span>
        <span className="mt-0.5 block text-xs text-app-muted">{descricao}</span>
      </span>
      {loading ? (
        <Loader2 size={16} className="shrink-0 animate-spin text-app-muted" />
      ) : (
        <CreditCard size={16} className="shrink-0 text-app-muted" />
      )}
    </button>
  );
}
