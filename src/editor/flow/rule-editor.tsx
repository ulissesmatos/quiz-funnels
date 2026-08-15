"use client";

import { Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import { walkBlocks } from "@/funnel/schema/block";
import type { Condition, ConditionLeaf } from "@/funnel/schema/common";
import type { FunnelDocument } from "@/funnel/schema/funnel";
import { Button } from "@/components/ui/button";

/**
 * Editor de uma condição de ramificação.
 *
 * Campos e opções vêm de selects montados a partir do próprio funil — ninguém
 * digita id na mão, que é onde a regra costuma nascer quebrada.
 */

type CampoDisponivel =
  | { source: "answer"; key: string; rotulo: string; opcoes: { id: string; label: string }[] }
  | { source: "score"; key?: string; rotulo: string; opcoes: [] }
  | { source: "variable"; key: string; rotulo: string; opcoes: [] };

export function RuleEditor({
  doc,
  fromStepId,
  toStepId,
  condicaoInicial,
  onSalvar,
  onRemover,
  onCancelar,
}: {
  doc: FunnelDocument;
  fromStepId: string;
  toStepId: string;
  condicaoInicial?: Condition;
  onSalvar: (condition: Condition) => void;
  onRemover?: () => void;
  onCancelar: () => void;
}) {
  const campos = useMemo(() => camposDisponiveis(doc, fromStepId), [doc, fromStepId]);

  const folhaInicial = extrairFolha(condicaoInicial);
  const [campoIndex, setCampoIndex] = useState(() => {
    if (!folhaInicial) return 0;
    const encontrado = campos.findIndex(
      (c) => c.source === folhaInicial.ref.source && c.key === folhaInicial.ref.key,
    );
    return encontrado === -1 ? 0 : encontrado;
  });

  const [operador, setOperador] = useState<ConditionLeaf["op"]>(folhaInicial?.op ?? "eq");
  const [valor, setValor] = useState(() =>
    folhaInicial?.value === undefined ? "" : String(folhaInicial.value),
  );

  const campo = campos[campoIndex];
  const destino = doc.steps.find((s) => s.id === toStepId);
  const origem = doc.steps.find((s) => s.id === fromStepId);

  if (!campo) {
    return (
      <div className="fl-popover">
        <p className="fl-popover-vazio">
          A tela &ldquo;{origem?.name}&rdquo; não tem nenhuma pergunta antes dela, então não há o
          que condicionar. Adicione um campo ou use a ordem normal das telas.
        </p>
        <Button size="sm" variant="secondary" onClick={onCancelar}>
          Fechar
        </Button>
      </div>
    );
  }

  const precisaDeValor = operador !== "is_set" && operador !== "is_empty";

  function salvar() {
    const condicao: Condition = {
      kind: "leaf",
      ref: { source: campo.source, key: campo.key },
      op: operador,
      value: precisaDeValor ? converterValor(valor) : undefined,
    };

    onSalvar(condicao);
  }

  return (
    <div className="fl-popover">
      <p className="fl-popover-titulo">
        Ir para <strong>{destino?.name}</strong> quando:
      </p>

      <label className="fl-campo">
        <span>Campo</span>
        <select
          className="ed-control"
          value={campoIndex}
          onChange={(e) => {
            setCampoIndex(Number(e.target.value));
            setValor("");
          }}
        >
          {campos.map((c, index) => (
            <option key={`${c.source}:${c.key ?? ""}`} value={index}>
              {c.rotulo}
            </option>
          ))}
        </select>
      </label>

      <label className="fl-campo">
        <span>Condição</span>
        <select
          className="ed-control"
          value={operador}
          onChange={(e) => setOperador(e.target.value as ConditionLeaf["op"])}
        >
          <option value="eq">é igual a</option>
          <option value="neq">é diferente de</option>
          <option value="contains">contém</option>
          <option value="gte">é maior ou igual a</option>
          <option value="lte">é menor ou igual a</option>
          <option value="is_set">está preenchido</option>
          <option value="is_empty">está vazio</option>
        </select>
      </label>

      {precisaDeValor && (
        <label className="fl-campo">
          <span>Valor</span>
          {campo.opcoes.length > 0 ? (
            <select className="ed-control" value={valor} onChange={(e) => setValor(e.target.value)}>
              <option value="">Escolha…</option>
              {campo.opcoes.map((opcao) => (
                <option key={opcao.id} value={opcao.id}>
                  {opcao.label}
                </option>
              ))}
            </select>
          ) : (
            <input
              className="ed-control"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder={campo.source === "score" ? "ex.: 5" : "valor"}
            />
          )}
        </label>
      )}

      <div className="fl-popover-acoes">
        {onRemover && (
          <button type="button" className="fl-popover-remover" onClick={onRemover}>
            <Trash2 size={13} />
            Remover
          </button>
        )}
        <Button size="sm" variant="ghost" onClick={onCancelar}>
          Cancelar
        </Button>
        <Button size="sm" onClick={salvar} disabled={precisaDeValor && !valor}>
          Salvar
        </Button>
      </div>
    </div>
  );
}

/**
 * Campos que já foram respondidos quando o visitante chega neste ponto.
 *
 * Condicionar numa pergunta que vem depois produziria uma regra que nunca bate,
 * então só entram os campos das telas anteriores e da própria.
 */
function camposDisponiveis(doc: FunnelDocument, ateStepId: string): CampoDisponivel[] {
  const campos: CampoDisponivel[] = [];
  const categorias = new Set<string>();

  for (const step of doc.steps) {
    for (const block of walkBlocks(step.blocks)) {
      if (block.type === "choice") {
        campos.push({
          source: "answer",
          key: block.props.name,
          rotulo: `Resposta: ${block.props.name}`,
          opcoes: block.props.options.map((o) => ({ id: o.id, label: o.label })),
        });

        for (const opcao of block.props.options) {
          for (const categoria of Object.keys(opcao.scores ?? {})) categorias.add(categoria);
        }
      }

      if (block.type === "input") {
        campos.push({
          source: "answer",
          key: block.props.name,
          rotulo: `Campo: ${block.props.name}`,
          opcoes: [],
        });
      }
    }

    if (step.id === ateStepId) break;
  }

  campos.push({ source: "score", rotulo: "Pontuação total", opcoes: [] });
  for (const categoria of categorias) {
    campos.push({ source: "score", key: categoria, rotulo: `Pontos: ${categoria}`, opcoes: [] });
  }

  for (const variavel of doc.variables) {
    campos.push({
      source: "variable",
      key: variavel.key,
      rotulo: `Variável: ${variavel.key}`,
      opcoes: [],
    });
  }

  return campos;
}

/** O editor trabalha com uma folha só; grupos vêm da IA ou do JSON. */
function extrairFolha(condition?: Condition): ConditionLeaf | null {
  if (!condition) return null;
  if (condition.kind === "leaf") return condition;
  if (condition.kind === "all" || condition.kind === "any") {
    return extrairFolha(condition.conditions[0]);
  }
  return null;
}

function converterValor(valor: string): string | number {
  const numero = Number(valor.replace(",", "."));
  return valor.trim() !== "" && Number.isFinite(numero) ? numero : valor;
}
