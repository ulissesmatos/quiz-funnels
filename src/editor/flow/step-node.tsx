"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { AlertCircle, EyeOff, Loader2, PencilLine, Sparkles, Split } from "lucide-react";

import { Icon } from "@/components/ui/icon";
import { walkBlocks } from "@/funnel/schema/block";
import { stepTypeMeta } from "@/funnel/schema/step";
import { cn } from "@/lib/cn";

import { corDeOrigem, type StepNodeData } from "./graph";

/**
 * Card de uma tela no mapa.
 *
 * Mostra o suficiente para reconhecer a tela sem abrir o Construtor — nome,
 * tipo, a pergunta principal e quantos blocos tem — mais os problemas que o
 * lint encontrou nela.
 */
export function StepNode({ data, selected }: NodeProps & { data: StepNodeData }) {
  const { step, index, resumo, problemas, condicionaisCount, personalizando, iaOcupada } = data;

  const temErro = problemas.some((p) => p.severity === "erro");
  const ramificacoes = step.logic.rules.length;
  const podeRamificar = ramificacoes === 0 && temEscolha(step.blocks);

  return (
    <div
      className={cn("fl-node", selected && "fl-node--selected", temErro && "fl-node--erro")}
      title={problemas.map((p) => p.message).join("\n") || undefined}
    >
      <Handle type="target" position={Position.Left} className="fl-handle" />

      <div className="fl-node-head">
        <Icon name={stepTypeMeta[step.type].icon} size={14} className="fl-node-icone" />
        <span className="fl-node-name">{step.name}</span>
        <span className="fl-node-index">{index + 1}</span>

        {/* Botões explícitos em vez de só duplo clique: o gesto escondido não
            se descobre sozinho, e no celular não existe. */}
        {data.onFocarIa && (
          <button
            type="button"
            className={cn("fl-node-abrir", personalizando && "fl-node-abrir--ativo")}
            aria-label={
              personalizando ? `Personalizando "${step.name}"…` : `Personalizar "${step.name}" com IA`
            }
            title={personalizando ? "Personalizando…" : "Personalizar com IA"}
            disabled={Boolean(iaOcupada)}
            onClick={(evento) => {
              evento.stopPropagation();
              data.onFocarIa!(step.id);
            }}
          >
            {personalizando ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
          </button>
        )}

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

        {ramificacoes > 0 && (
          <span
            className="fl-node-tag fl-node-tag--ramo"
            style={{ color: corDeOrigem(step.id) }}
            title="Quantos caminhos saem desta tela por regra"
          >
            <Split size={11} />
            {ramificacoes === 1 ? "1 ramificação" : `${ramificacoes} ramificações`}
          </span>
        )}

        {podeRamificar && (
          <span className="fl-node-tag fl-node-tag--sutil" title="Esta tela tem uma pergunta e pode ramificar">
            <Split size={11} />
            ramificável
          </span>
        )}

        {condicionaisCount > 0 && (
          <span
            className="fl-node-tag"
            title="Blocos que só aparecem sob condição"
          >
            <EyeOff size={11} />
            {condicionaisCount === 1 ? "1 condicional" : `${condicionaisCount} condicionais`}
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
