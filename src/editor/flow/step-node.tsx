"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { AlertCircle, PencilLine, Split } from "lucide-react";

import { walkBlocks } from "@/funnel/schema/block";
import type { StepType } from "@/funnel/schema/step";
import { cn } from "@/lib/cn";

import type { StepNodeData } from "./graph";

const ICONES: Record<StepType, string> = {
  question: "❓",
  content: "📄",
  loading: "⏳",
  result: "✨",
  form: "📝",
  checkout: "🛒",
};

/**
 * Card de uma tela no mapa.
 *
 * Mostra o suficiente para reconhecer a tela sem abrir o Construtor — nome,
 * tipo, a pergunta principal e quantos blocos tem — mais os problemas que o
 * lint encontrou nela.
 */
export function StepNode({ data, selected }: NodeProps & { data: StepNodeData }) {
  const { step, index, resumo, problemas } = data;

  const temErro = problemas.some((p) => p.severity === "erro");
  const podeRamificar = temEscolha(step.blocks);

  return (
    <div
      className={cn("fl-node", selected && "fl-node--selected", temErro && "fl-node--erro")}
      title={problemas.map((p) => p.message).join("\n") || undefined}
    >
      <Handle type="target" position={Position.Left} className="fl-handle" />

      <div className="fl-node-head">
        <span aria-hidden>{ICONES[step.type]}</span>
        <span className="fl-node-name">{step.name}</span>
        <span className="fl-node-index">{index + 1}</span>

        {/* Botão explícito em vez de só duplo clique: o gesto escondido não se
            descobre sozinho, e no celular não existe. */}
        <button
          type="button"
          className="fl-node-abrir"
          aria-label={`Abrir "${step.name}" no Construtor`}
          title="Abrir no Construtor"
          onClick={(evento) => {
            evento.stopPropagation();
            data.onAbrir(step.id);
          }}
        >
          <PencilLine size={12} />
        </button>
      </div>

      {resumo && <p className="fl-node-resumo">{resumo}</p>}

      <div className="fl-node-foot">
        <span>
          {step.blocks.length} {step.blocks.length === 1 ? "bloco" : "blocos"}
        </span>

        {podeRamificar && (
          <span className="fl-node-tag" title="Esta tela tem uma pergunta e pode ramificar">
            <Split size={11} />
            ramificável
          </span>
        )}

        {step.logic.isEnd && <span className="fl-node-tag">fim</span>}

        {problemas.length > 0 && (
          <span className={cn("fl-node-tag", temErro && "fl-node-tag--erro")}>
            <AlertCircle size={11} />
            {problemas.length}
          </span>
        )}
      </div>

      <Handle type="source" position={Position.Right} className="fl-handle" />
    </div>
  );
}

function temEscolha(blocks: StepNodeData["step"]["blocks"]): boolean {
  for (const block of walkBlocks(blocks)) {
    if (block.type === "choice") return true;
  }
  return false;
}
