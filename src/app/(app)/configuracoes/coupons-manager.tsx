"use client";

import { Loader2, X } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { createCouponAction, deleteCouponAction, toggleCouponAction } from "@/server/coupons/actions";
import type { CouponListItem } from "@/server/coupons/queries";
import { cn } from "@/lib/cn";

export function CouponsManager({
  coupons: couponsIniciais,
  funnels,
}: {
  coupons: CouponListItem[];
  funnels: { id: string; name: string }[];
}) {
  const [coupons, setCoupons] = useState(couponsIniciais);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-app-muted">
        Códigos de desconto que o bloco de Checkout aceita no funil publicado. Um cupom sem funil marcado vale
        pra qualquer funil desta organização.
      </p>

      <NovoCupomForm funnels={funnels} onCriado={(coupon) => setCoupons((atual) => [coupon, ...atual])} />

      {coupons.length > 0 && (
        <ul className="flex flex-col gap-2">
          {coupons.map((coupon) => (
            <CupomRow
              key={coupon.id}
              coupon={coupon}
              onRemovido={() => setCoupons((atual) => atual.filter((c) => c.id !== coupon.id))}
              onAlternado={(active) =>
                setCoupons((atual) => atual.map((c) => (c.id === coupon.id ? { ...c, active } : c)))
              }
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function NovoCupomForm({
  funnels,
  onCriado,
}: {
  funnels: { id: string; name: string }[];
  onCriado: (coupon: CouponListItem) => void;
}) {
  const [code, setCode] = useState("");
  const [type, setType] = useState<"percent" | "fixed">("percent");
  const [value, setValue] = useState("10");
  const [funnelId, setFunnelId] = useState("");
  const [pending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    const valorNumerico = type === "percent" ? Number(value) : Math.round(Number(value) * 100);

    startTransition(async () => {
      const result = await createCouponAction({
        code,
        type,
        value: valorNumerico,
        funnelId: funnelId || null,
        maxUses: null,
        expiresAt: null,
      });
      if (!result.ok) {
        setErro(result.error);
        return;
      }

      setCode("");
      onCriado({
        id: crypto.randomUUID(),
        code: code.trim().toUpperCase(),
        type,
        value: valorNumerico,
        funnelId: funnelId || null,
        funnelName: funnels.find((f) => f.id === funnelId)?.name ?? null,
        maxUses: null,
        usedCount: 0,
        expiresAt: null,
        active: true,
        createdAt: new Date(),
      });
    });
  }

  return (
    <form onSubmit={enviar} className="rounded-2xl border border-app-border bg-app-surface p-4">
      <h3 className="text-sm font-medium">Novo cupom</h3>

      <div className="mt-3 flex flex-wrap items-end gap-3">
        <Field label="Código">
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="BEMVINDO10"
            className="w-40"
          />
        </Field>

        <Field label="Tipo">
          <select
            value={type}
            onChange={(e) => setType(e.target.value as "percent" | "fixed")}
            className="h-10 rounded-lg border border-app-border bg-app-surface px-3 text-sm text-app-text focus:border-app-primary focus:outline-none"
          >
            <option value="percent">% desconto</option>
            <option value="fixed">R$ desconto</option>
          </select>
        </Field>

        <Field label={type === "percent" ? "Percentual" : "Valor (R$)"}>
          <Input
            type="number"
            min={1}
            max={type === "percent" ? 100 : undefined}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-24"
          />
        </Field>

        <Field label="Funil">
          <select
            value={funnelId}
            onChange={(e) => setFunnelId(e.target.value)}
            className="h-10 rounded-lg border border-app-border bg-app-surface px-3 text-sm text-app-text focus:border-app-primary focus:outline-none"
          >
            <option value="">Todos os funis</option>
            {funnels.map((funnel) => (
              <option key={funnel.id} value={funnel.id}>
                {funnel.name}
              </option>
            ))}
          </select>
        </Field>

        <Button type="submit" size="sm" disabled={pending || !code.trim()}>
          {pending ? <Loader2 size={14} className="animate-spin" /> : "Criar"}
        </Button>
      </div>

      {erro && <p className="mt-2 text-xs text-app-danger">{erro}</p>}
    </form>
  );
}

function CupomRow({
  coupon,
  onRemovido,
  onAlternado,
}: {
  coupon: CouponListItem;
  onRemovido: () => void;
  onAlternado: (active: boolean) => void;
}) {
  const [pending, startTransition] = useTransition();

  function alternar() {
    const novoEstado = !coupon.active;
    startTransition(async () => {
      const result = await toggleCouponAction(coupon.id, novoEstado);
      if (result.ok) onAlternado(novoEstado);
    });
  }

  function remover() {
    startTransition(async () => {
      const result = await deleteCouponAction(coupon.id);
      if (result.ok) onRemovido();
    });
  }

  return (
    <li
      className={cn(
        "flex items-center justify-between gap-3 rounded-lg border border-app-border bg-app-surface px-3 py-2.5",
        pending && "opacity-60",
      )}
    >
      <div className="min-w-0">
        <p className="truncate text-sm text-app-text">
          <code className="rounded bg-app-surface-2 px-1 py-0.5">{coupon.code}</code>{" "}
          {coupon.type === "percent" ? `${coupon.value}% off` : `R$ ${(coupon.value / 100).toFixed(2)} off`}
        </p>
        <p className="text-xs text-app-muted">
          {coupon.funnelName ?? "Todos os funis"} · usado {coupon.usedCount}
          {coupon.maxUses ? `/${coupon.maxUses}` : ""} {coupon.maxUses ? "vezes" : "vez(es)"}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={alternar}
          className={cn(
            "rounded-full px-2.5 py-1 text-xs",
            coupon.active ? "bg-app-success/15 text-app-success" : "bg-app-surface-2 text-app-muted",
          )}
        >
          {coupon.active ? "Ativo" : "Pausado"}
        </button>

        <button
          type="button"
          title="Remover cupom"
          disabled={pending}
          onClick={remover}
          className="grid h-8 w-8 place-items-center rounded-md text-app-muted hover:bg-app-danger/10 hover:text-app-danger"
        >
          <X size={14} />
        </button>
      </div>
    </li>
  );
}
