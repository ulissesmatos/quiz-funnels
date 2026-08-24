"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { createPlanAction, updatePlanAction, type PlanFormInput } from "@/server/admin/plan-actions";
import type { AdminPlanRow } from "@/server/admin/plans";

/** Vazio = sem teto (`null`). É assim que "ilimitado" é representado em `plans`. */
function paraNumeroOuNulo(valor: string): number | null {
  const limpo = valor.trim();
  return limpo === "" ? null : Number(limpo);
}

export function PlanForm({ plano }: { plano?: AdminPlanRow }) {
  const router = useRouter();
  const [nome, setNome] = useState(plano?.name ?? "");
  const [slug, setSlug] = useState(plano?.slug ?? "");
  const [descricao, setDescricao] = useState(plano?.description ?? "");
  const [preco, setPreco] = useState(plano ? String(plano.monthlyPriceCents / 100) : "");
  const [trialDays, setTrialDays] = useState(String(plano?.trialDays ?? 7));
  const [maxFunnels, setMaxFunnels] = useState(plano?.maxFunnels != null ? String(plano.maxFunnels) : "");
  const [maxLeads, setMaxLeads] = useState(plano?.maxLeadsPerFunnel != null ? String(plano.maxLeadsPerFunnel) : "");
  const [canUseTeam, setCanUseTeam] = useState(plano?.canUseTeam ?? false);
  const [canUseWebhooks, setCanUseWebhooks] = useState(plano?.canUseWebhooks ?? false);
  const [featured, setFeatured] = useState(plano?.featured ?? false);
  const [active, setActive] = useState(plano?.active ?? true);
  const [pending, setPending] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function salvar(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setPending(true);

    const input: PlanFormInput = {
      name: nome.trim(),
      slug: slug.trim(),
      description: descricao.trim() || undefined,
      monthlyPriceCents: Math.round(Number(preco.replace(",", ".")) * 100),
      trialDays: Number(trialDays),
      maxFunnels: paraNumeroOuNulo(maxFunnels),
      maxLeadsPerFunnel: paraNumeroOuNulo(maxLeads),
      canUseTeam,
      canUseWebhooks,
      featured,
      active,
    };

    // No sucesso de `createPlanAction` a chamada nunca "retorna" de verdade —
    // ela redireciona pra `/admin/planos/{id}` por dentro, o que já navega a
    // página sozinho. Só a falha (validação, slug repetido) chega até aqui.
    const result = plano ? await updatePlanAction(plano.id, input) : await createPlanAction(input);

    setPending(false);
    if (!result.ok) {
      setErro(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <form onSubmit={salvar} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome">
          <Input value={nome} onChange={(e) => setNome(e.target.value)} required />
        </Field>
        <Field label="Identificador" hint="Só letras minúsculas, números e hífen.">
          <Input
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase())}
            pattern="[a-z0-9-]+"
            required
          />
        </Field>
      </div>

      <Field label="Descrição" hint="Frase curta exibida no card de checkout — opcional.">
        <Textarea rows={2} value={descricao} onChange={(e) => setDescricao(e.target.value)} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Preço mensal (R$)">
          <Input
            type="number"
            min="0"
            step="0.01"
            value={preco}
            onChange={(e) => setPreco(e.target.value)}
            required
          />
        </Field>
        <Field label="Dias de trial">
          <Input type="number" min={0} max={90} value={trialDays} onChange={(e) => setTrialDays(e.target.value)} required />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Máximo de funis" hint="Vazio = sem limite.">
          <Input type="number" min={1} value={maxFunnels} onChange={(e) => setMaxFunnels(e.target.value)} />
        </Field>
        <Field label="Máximo de leads por funil" hint="Vazio = sem limite. Contagem vitalícia, não mensal.">
          <Input type="number" min={1} value={maxLeads} onChange={(e) => setMaxLeads(e.target.value)} />
        </Field>
      </div>

      <div className="flex flex-col gap-2.5 rounded-lg border border-app-border p-3">
        <Checkbox label="Permite equipe (convidar membros)" checked={canUseTeam} onChange={setCanUseTeam} />
        <Checkbox label="Permite webhooks" checked={canUseWebhooks} onChange={setCanUseWebhooks} />
        <Checkbox
          label="Destaque na página de checkout"
          hint="Só um plano fica marcado — marcar este desmarca os outros."
          checked={featured}
          onChange={setFeatured}
        />
        <Checkbox
          label="Ativo (aparece na página de checkout)"
          hint="Desligar não afeta quem já está neste plano — só some pra quem ainda vai assinar."
          checked={active}
          onChange={setActive}
        />
      </div>

      {erro && <Alert tone="danger">{erro}</Alert>}

      <div>
        <Button type="submit" loading={pending} disabled={!nome.trim() || !slug.trim() || !preco.trim()}>
          {plano ? "Salvar alterações" : "Criar plano"}
        </Button>
      </div>
    </form>
  );
}

function Checkbox({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-2.5">
      <input
        type="checkbox"
        className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-app-primary)]"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>
        <span className="block text-sm">{label}</span>
        {hint && <span className="text-[11px] leading-snug text-app-muted">{hint}</span>}
      </span>
    </label>
  );
}
