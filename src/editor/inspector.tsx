"use client";

import { Sparkles } from "lucide-react";

import { getBlockDefinition } from "@/funnel/schema/block";
import { stepTypeMeta } from "@/funnel/schema/step";
import { cn } from "@/lib/cn";

import { AiPanel } from "./ai-panel";
import type { AiPrefill } from "./ai-kickoff";
import { BlockVisibilitySection } from "./block-visibility";
import { useDocument, useEditor, useSelectedBlock, useSelectedStep } from "./editor-context";
import { SchemaForm } from "./schema-form";
import { ThemePanel } from "./theme-panel";

export type Aba = "bloco" | "tela" | "tema" | "ia";

const ABAS: { chave: Aba; rotulo: string }[] = [
  { chave: "bloco", rotulo: "Bloco" },
  { chave: "tela", rotulo: "Tela" },
  { chave: "tema", rotulo: "Tema" },
  { chave: "ia", rotulo: "IA" },
];

export function Inspector({
  aba,
  onAbaChange,
  aiPrefill,
  onAiPrefillConsumed,
}: {
  aba: Aba;
  onAbaChange: (aba: Aba) => void;
  aiPrefill?: AiPrefill | null;
  onAiPrefillConsumed?: () => void;
}) {
  const bloco = useSelectedBlock();

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 gap-1 border-b border-app-border p-2">
        {ABAS.map(({ chave, rotulo }) => (
          <button
            key={chave}
            type="button"
            onClick={() => onAbaChange(chave)}
            className={cn(
              "flex flex-1 items-center justify-center gap-1 rounded-md px-2 py-1.5 text-xs transition-colors",
              aba === chave
                ? "bg-app-surface-2 text-app-text"
                : "text-app-muted hover:text-app-text",
              chave === "ia" && aba !== "ia" && "text-app-primary",
            )}
          >
            {chave === "ia" && <Sparkles size={12} />}
            {rotulo}
          </button>
        ))}
      </div>

      {/* O copiloto tem rolagem própria e ocupa a altura toda. Fica sempre
          montado (só escondido por CSS) para a conversa não se perder toda
          vez que a pessoa troca de aba. */}
      <div className={cn("min-h-0 flex-1", aba !== "ia" && "hidden")}>
        <AiPanel prefill={aiPrefill} onPrefillConsumed={onAiPrefillConsumed} />
      </div>

      {aba !== "ia" && (
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {aba === "bloco" && (bloco ? <PainelDoBloco /> : <Vazio />)}
          {aba === "tela" && <PainelDaTela />}
          {aba === "tema" && <ThemePanel />}
        </div>
      )}
    </div>
  );
}

function Vazio() {
  return (
    <p className="px-1 py-6 text-center text-sm text-app-muted">
      Selecione um bloco no canvas para editar as propriedades dele.
    </p>
  );
}

function PainelDoBloco() {
  const bloco = useSelectedBlock();
  const dispatch = useEditor((s) => s.dispatch);

  if (!bloco) return <Vazio />;

  const definition = getBlockDefinition(bloco.type);
  if (!definition) return <Vazio />;

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h2 className="text-sm font-medium">{definition.label}</h2>
        <p className="mt-0.5 text-[11px] leading-snug text-app-muted">{definition.description}</p>
      </header>

      <SchemaForm
        schema={definition.props}
        value={bloco.props as Record<string, unknown>}
        onChange={(patch, campo) =>
          dispatch(
            { type: "update_block", blockId: bloco.id, patch: { props: patch } },
            // Digitar num campo é um passo de undo só, não um por tecla.
            { label: `Editar ${definition.label.toLowerCase()}`, mergeKey: `${bloco.id}.${campo}` },
          )
        }
      />

      <BlockVisibilitySection bloco={bloco} />

      <p className="border-t border-app-border pt-2 font-mono text-[10px] text-app-muted">
        id: {bloco.id}
      </p>
    </div>
  );
}

function PainelDaTela() {
  const step = useSelectedStep();
  const doc = useDocument();
  const dispatch = useEditor((s) => s.dispatch);

  if (!step) return null;

  const posicao = doc.steps.findIndex((s) => s.id === step.id) + 1;

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h2 className="text-sm font-medium">Tela {posicao}</h2>
        <p className="mt-0.5 text-[11px] text-app-muted">
          Nome e tipo aparecem só no editor e nos relatórios.
        </p>
      </header>

      <label className="flex flex-col gap-1">
        <span className="text-sm">Nome</span>
        <input
          className="ed-control"
          value={step.name}
          onChange={(e) =>
            dispatch(
              { type: "update_step", stepId: step.id, patch: { name: e.target.value } },
              { label: "Renomear tela", mergeKey: `${step.id}.name` },
            )
          }
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm">Tipo</span>
        <select
          className="ed-control"
          value={step.type}
          onChange={(e) =>
            dispatch({
              type: "update_step",
              stepId: step.id,
              patch: { type: e.target.value as typeof step.type },
            })
          }
        >
          {Object.entries(stepTypeMeta).map(([chave, meta]) => (
            <option key={chave} value={chave}>
              {meta.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm">Alinhamento</span>
        <select
          className="ed-control"
          value={step.layout.align}
          onChange={(e) =>
            dispatch({
              type: "update_step",
              stepId: step.id,
              patch: { layout: { ...step.layout, align: e.target.value as "left" | "center" } },
            })
          }
        >
          <option value="center">Centralizado</option>
          <option value="left">À esquerda</option>
        </select>
      </label>

      <label className="flex items-start gap-2.5">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4 accent-[var(--color-app-primary)]"
          checked={step.layout.fullHeight}
          onChange={(e) =>
            dispatch({
              type: "update_step",
              stepId: step.id,
              patch: { layout: { ...step.layout, fullHeight: e.target.checked } },
            })
          }
        />
        <span>
          <span className="block text-sm">Ocupar a tela toda</span>
          <span className="text-[11px] leading-snug text-app-muted">
            Centraliza o conteúdo verticalmente. Ligado em perguntas, desligado em conteúdo longo.
          </span>
        </span>
      </label>

      <label className="flex items-start gap-2.5">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4 accent-[var(--color-app-primary)]"
          checked={step.logic.isEnd ?? false}
          onChange={(e) =>
            dispatch({
              type: "update_step",
              stepId: step.id,
              patch: { logic: { ...step.logic, isEnd: e.target.checked } },
            })
          }
        />
        <span>
          <span className="block text-sm">Encerrar o funil aqui</span>
          <span className="text-[11px] leading-snug text-app-muted">
            Nenhuma tela seguinte é exibida a partir desta.
          </span>
        </span>
      </label>
    </div>
  );
}
