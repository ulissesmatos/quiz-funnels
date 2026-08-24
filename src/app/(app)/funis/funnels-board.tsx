"use client";

import { BarChart3, ExternalLink, Layers, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/field";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/cn";
import { formatarData } from "@/lib/format";
import type { FunnelListItem } from "@/server/funnels/queries";

import { FunnelPreview } from "./funnel-preview";

type Ordenacao = "recentes" | "visualizacoes" | "nome";

const OPCOES_DE_ORDENACAO: { valor: Ordenacao; rotulo: string }[] = [
  { valor: "recentes", rotulo: "Recentes" },
  { valor: "visualizacoes", rotulo: "Mais vistos" },
  { valor: "nome", rotulo: "Nome A–Z" },
];

/**
 * Cabeçalho de KPIs + busca/ordenação + grade de funis.
 *
 * Cliente porque busca e ordenação são instantâneas (sem round-trip nem
 * perder o scroll) — a lista inteira já veio do servidor com prévia e
 * estatística prontas, filtrar em memória é barato até a casa dos milhares.
 */
export function FunnelsBoard({ items }: { items: FunnelListItem[] }) {
  const [busca, setBusca] = useState("");
  const [ordenacao, setOrdenacao] = useState<Ordenacao>("recentes");

  const publicados = items.filter((f) => f.isPublished).length;
  const totalViews = items.reduce((soma, f) => soma + f.stats.views, 0);
  const totalConclusoes = items.reduce((soma, f) => soma + f.stats.completions, 0);
  const conversaoMedia = totalViews > 0 ? totalConclusoes / totalViews : 0;

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const lista = termo ? items.filter((f) => f.name.toLowerCase().includes(termo)) : [...items];

    return lista.sort((a, b) => {
      if (ordenacao === "nome") return a.name.localeCompare(b.name, "pt-BR");
      if (ordenacao === "visualizacoes") return b.stats.views - a.stats.views;
      return b.updatedAt.getTime() - a.updatedAt.getTime();
    });
  }, [items, busca, ordenacao]);

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiChip label="Funis" value={String(items.length)} />
        <KpiChip label="Publicados" value={String(publicados)} />
        <KpiChip label="Views · 30d" value={String(totalViews)} />
        <KpiChip label="Conversão média" value={`${Math.round(conversaoMedia * 100)}%`} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search size={14} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-app-muted" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome…"
            aria-label="Buscar funil por nome"
            className="pl-9"
          />
        </div>

        <div className="flex shrink-0 rounded-lg border border-app-border p-0.5">
          {OPCOES_DE_ORDENACAO.map((opcao) => (
            <button
              key={opcao.valor}
              type="button"
              aria-pressed={ordenacao === opcao.valor}
              onClick={() => setOrdenacao(opcao.valor)}
              className={cn(
                "rounded-md px-2.5 py-1.5 text-xs transition-colors duration-150 ease-app",
                ordenacao === opcao.valor ? "bg-app-surface-2 text-app-text" : "text-app-muted hover:text-app-text",
              )}
            >
              {opcao.rotulo}
            </button>
          ))}
        </div>
      </div>

      {filtrados.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-app-border px-6 py-16 text-center text-sm text-app-muted">
          Nenhum funil encontrado para &ldquo;{busca}&rdquo;.
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtrados.map((funnel) => (
            <li key={funnel.id}>
              <FunnelCard funnel={funnel} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function KpiChip({ label, value }: { label: string; value: string }) {
  return (
    <Card padding="sm">
      <p className="text-xs font-medium tracking-wide text-app-muted uppercase">{label}</p>
      <p className="mt-1.5 font-mono text-xl font-bold tracking-[-0.02em] text-app-text tabular-nums">{value}</p>
    </Card>
  );
}

function FunnelCard({ funnel }: { funnel: FunnelListItem }) {
  return (
    <Card padding="none" interactive className="group flex h-full flex-col overflow-hidden">
      <Link href={`/funis/${funnel.id}`} className="flex flex-1 flex-col">
        {/* Miniatura maior: numa lista com dezenas de funis, é a prévia real —
            não o número de telas — que ajuda a reconhecer qual é qual. */}
        <div className="h-40 shrink-0 overflow-hidden border-b border-app-border">
          <FunnelPreview dados={funnel.preview} />
        </div>

        <div className="flex-1 px-4 pt-4">
          <h2 className="font-semibold tracking-tight transition-colors duration-150 ease-app group-hover:text-app-primary">
            {funnel.name}
          </h2>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-app-muted">
            <Layers size={11} />
            {funnel.stepCount} {funnel.stepCount === 1 ? "tela" : "telas"}
            <span className="text-app-border">·</span>
            {formatarData(funnel.updatedAt)}
          </p>
        </div>

        <p className="px-4 pt-2 text-xs text-app-muted tabular-nums">
          {funnel.stats.views} {funnel.stats.views === 1 ? "view" : "views"} · {Math.round(funnel.stats.conversionRate * 100)}% conv. ·{" "}
          <span className="text-app-border">30d</span>
        </p>
      </Link>

      <div className="flex items-center justify-between gap-2 px-4 pt-3 pb-4">
        <Badge tone={funnel.isPublished ? "success" : "neutral"} dot>
          {funnel.isPublished ? "Publicado" : "Rascunho"}
        </Badge>

        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href={`/funis/${funnel.id}/analytics`}
                aria-label="Ver analytics"
                className="grid h-7 w-7 place-items-center rounded-md text-app-muted transition-colors duration-150 ease-app hover:bg-app-surface-2 hover:text-app-text"
              >
                <BarChart3 size={13} />
              </Link>
            </TooltipTrigger>
            <TooltipContent>Ver analytics</TooltipContent>
          </Tooltip>

          {funnel.isPublished && (
            <Tooltip>
              <TooltipTrigger asChild>
                <a
                  href={`/f/${funnel.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Abrir funil publicado"
                  className="grid h-7 w-7 place-items-center rounded-md text-app-muted transition-colors duration-150 ease-app hover:bg-app-surface-2 hover:text-app-text"
                >
                  <ExternalLink size={13} />
                </a>
              </TooltipTrigger>
              <TooltipContent>Abrir funil publicado</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </Card>
  );
}
