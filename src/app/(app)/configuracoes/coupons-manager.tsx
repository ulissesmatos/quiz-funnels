"use client";

import { X } from "lucide-react";
import { useState, useTransition } from "react";

import { badgeStyles } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/field";
import { ListRow, ListRowActions, ListRowMain } from "@/components/ui/list-row";
import { CodeChip } from "@/components/ui/misc";
import { createCouponAction, deleteCouponAction, toggleCouponAction } from "@/server/coupons/actions";
import type { CouponListItem } from "@/server/coupons/queries";

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
    <Card padding="sm" className="bg-app-surface-2/40">
      <form onSubmit={enviar}>
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
            <Select
              value={type}
              onChange={(e) => setType(e.target.value as "percent" | "fixed")}
              className="w-36"
            >
              <option value="percent">% desconto</option>
              <option value="fixed">R$ desconto</option>
            </Select>
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
            <Select value={funnelId} onChange={(e) => setFunnelId(e.target.value)} className="w-48">
              <option value="">Todos os funis</option>
              {funnels.map((funnel) => (
                <option key={funnel.id} value={funnel.id}>
                  {funnel.name}
                </option>
              ))}
            </Select>
          </Field>

          <Button type="submit" size="sm" loading={pending} disabled={!code.trim()}>
            Criar
          </Button>
        </div>

        {erro && <p className="mt-2 text-xs text-app-danger">{erro}</p>}
      </form>
    </Card>
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
    <ListRow pending={pending}>
      <ListRowMain
        title={
          <>
            <CodeChip>{coupon.code}</CodeChip>{" "}
            {coupon.type === "percent" ? `${coupon.value}% off` : `R$ ${(coupon.value / 100).toFixed(2)} off`}
          </>
        }
      >
        {coupon.funnelName ?? "Todos os funis"} · usado {coupon.usedCount}
        {coupon.maxUses ? `/${coupon.maxUses}` : ""} {coupon.maxUses ? "vezes" : "vez(es)"}
      </ListRowMain>

      <ListRowActions>
        {/* Pill que também é o interruptor — por isso é `<button>` com o
            estilo do Badge, e não um Badge com onClick. */}
        <button
          type="button"
          disabled={pending}
          onClick={alternar}
          aria-pressed={coupon.active}
          className={badgeStyles({ tone: coupon.active ? "success" : "neutral", size: "md" })}
        >
          {coupon.active ? "Ativo" : "Pausado"}
        </button>

        <Button
          variant="ghost-danger"
          size="icon-sm"
          aria-label={`Remover cupom ${coupon.code}`}
          title="Remover cupom"
          disabled={pending}
          onClick={remover}
        >
          <X size={14} />
        </Button>
      </ListRowActions>
    </ListRow>
  );
}
