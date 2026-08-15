"use client";

import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { Condition } from "@/funnel/schema/common";
import type { FunnelDocument } from "@/funnel/schema/funnel";
import { cn } from "@/lib/cn";

import type { ConditionBuilderValue, ConditionRow } from "./condition-builder-utils";
import { converterValor, linhaPadrao } from "./condition-builder-utils";
import type { CampoDisponivel } from "./condition-fields";
import { descreverCondicao } from "./flow/graph";

import "./condition-builder.css";

const OPERADORES: { value: ConditionRow["op"]; label: string }[] = [
  { value: "eq", label: "é igual a" },
  { value: "neq", label: "é diferente de" },
  { value: "contains", label: "contém" },
  { value: "gte", label: "é maior ou igual a" },
  { value: "lte", label: "é menor ou igual a" },
  { value: "is_set", label: "está preenchido" },
  { value: "is_empty", label: "está vazio" },
];

/**
 * Editor visual de uma condição: um nível de E/OU sobre linhas campo/condição/valor.
 *
 * Controlado — não despacha nada. Quem chama decide quando e como persistir
 * (ver `RuleEditor`, que só salva ao clicar em Salvar, e `BlockVisibilitySection`,
 * que despacha a cada mudança).
 */
export function ConditionBuilder({
  doc,
  value,
  onChange,
  campos,
  irrepresentavel,
  onDescartarIrrepresentavel,
}: {
  doc: FunnelDocument;
  value: ConditionBuilderValue;
  onChange: (value: ConditionBuilderValue, motivo: "estrutura" | "valor") => void;
  campos: CampoDisponivel[];
  irrepresentavel?: Condition | null;
  onDescartarIrrepresentavel?: () => void;
}) {
  if (irrepresentavel) {
    return (
      <div className="cb-irrepresentavel">
        <p>
          Esta condição usa um formato mais avançado do que o editor visual suporta — como
          &ldquo;não&rdquo; ou grupos combinados. Ela continua funcionando como está.
        </p>
        <p className="cb-irrepresentavel-resumo">{descreverCondicao(irrepresentavel, doc)}</p>
        {onDescartarIrrepresentavel && (
          <Button size="sm" variant="secondary" onClick={onDescartarIrrepresentavel}>
            Substituir por uma condição simples
          </Button>
        )}
      </div>
    );
  }

  function atualizarLinha(indice: number, patch: Partial<ConditionRow>, motivo: "estrutura" | "valor") {
    const rows = value.rows.map((row, i) => (i === indice ? { ...row, ...patch } : row));
    onChange({ ...value, rows }, motivo);
  }

  function adicionarLinha() {
    if (campos.length === 0) return;
    onChange({ ...value, rows: [...value.rows, linhaPadrao(campos[0]!)] }, "estrutura");
  }

  function removerLinha(indice: number) {
    onChange({ ...value, rows: value.rows.filter((_, i) => i !== indice) }, "estrutura");
  }

  return (
    <div className="cb-builder">
      {value.rows.length === 0 && campos.length > 0 && (
        <p className="cb-vazio">Nenhuma condição ainda.</p>
      )}

      {value.rows.map((row, indice) => (
        <LinhaDeCondicao
          key={indice}
          row={row}
          campos={campos}
          mostrarConector={indice > 0}
          conector={value.match}
          onMudarConector={(match) => onChange({ ...value, match }, "estrutura")}
          onMudar={(patch, motivo) => atualizarLinha(indice, patch, motivo)}
          onRemover={value.rows.length > 1 ? () => removerLinha(indice) : undefined}
        />
      ))}

      {campos.length > 0 && (
        <button type="button" className="cb-addrow" onClick={adicionarLinha}>
          <Plus size={13} />
          Adicionar condição
        </button>
      )}
    </div>
  );
}

function LinhaDeCondicao({
  row,
  campos,
  mostrarConector,
  conector,
  onMudarConector,
  onMudar,
  onRemover,
}: {
  row: ConditionRow;
  campos: CampoDisponivel[];
  mostrarConector: boolean;
  conector: "all" | "any";
  onMudarConector: (match: "all" | "any") => void;
  onMudar: (patch: Partial<ConditionRow>, motivo: "estrutura" | "valor") => void;
  onRemover?: () => void;
}) {
  const campoIndex = Math.max(
    0,
    campos.findIndex((c) => c.source === row.source && c.key === row.key),
  );
  const campo = campos[campoIndex];
  const precisaDeValor = row.op !== "is_set" && row.op !== "is_empty";
  const valorTexto = row.value === undefined ? "" : String(row.value);

  return (
    <div className="cb-row">
      {mostrarConector && (
        <div className="cb-match">
          <button
            type="button"
            className={cn("cb-match-opcao", conector === "all" && "is-active")}
            onClick={() => onMudarConector("all")}
          >
            E
          </button>
          <button
            type="button"
            className={cn("cb-match-opcao", conector === "any" && "is-active")}
            onClick={() => onMudarConector("any")}
          >
            OU
          </button>
        </div>
      )}

      <div className="cb-row-controles">
        <select
          className="ed-control"
          value={campoIndex}
          onChange={(e) => {
            const novoCampo = campos[Number(e.target.value)];
            if (!novoCampo) return;
            onMudar({ source: novoCampo.source, key: novoCampo.key, value: undefined }, "estrutura");
          }}
        >
          {campos.map((c, i) => (
            <option key={`${c.source}:${c.key ?? ""}`} value={i}>
              {c.rotulo}
            </option>
          ))}
        </select>

        <select
          className="ed-control"
          value={row.op}
          onChange={(e) =>
            onMudar(
              { op: e.target.value as ConditionRow["op"], value: undefined },
              "estrutura",
            )
          }
        >
          {OPERADORES.map((op) => (
            <option key={op.value} value={op.value}>
              {op.label}
            </option>
          ))}
        </select>

        {precisaDeValor &&
          (campo && campo.opcoes.length > 0 ? (
            <select
              className="ed-control"
              value={valorTexto}
              onChange={(e) => onMudar({ value: e.target.value }, "estrutura")}
            >
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
              value={valorTexto}
              onChange={(e) => onMudar({ value: converterValor(e.target.value) }, "valor")}
              placeholder={campo?.source === "score" ? "ex.: 5" : "valor"}
            />
          ))}

        {onRemover && (
          <button type="button" className="cb-remove" aria-label="Remover condição" onClick={onRemover}>
            <Trash2 size={13} />
          </button>
        )}
      </div>
    </div>
  );
}
