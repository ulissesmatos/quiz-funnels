"use client";

import { Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import type { Condition } from "@/funnel/schema/common";
import type { FunnelDocument } from "@/funnel/schema/funnel";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

import { ConditionBuilder } from "../condition-builder";
import { condicaoParaBuilder, builderParaCondicao, type ConditionParaBuilder } from "../condition-builder-utils";
import { camposDisponiveis } from "../condition-fields";

/**
 * Editor de uma condição de ramificação.
 *
 * Campos e opções vêm de selects montados a partir do próprio funil — ninguém
 * digita id na mão, que é onde a regra costuma nascer quebrada.
 */

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

  const [builder, setBuilder] = useState<ConditionParaBuilder>(() =>
    condicaoParaBuilder(condicaoInicial, campos[0]),
  );

  const destino = doc.steps.find((s) => s.id === toStepId);
  const origem = doc.steps.find((s) => s.id === fromStepId);

  if (campos.length === 0) {
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

  const semLinhas = !builder.irrepresentavel && builder.value.rows.length === 0;
  const semValor = builder.value.rows.some(
    (row) => row.op !== "is_set" && row.op !== "is_empty" && !row.value && row.value !== 0,
  );

  function salvar() {
    onSalvar(builderParaCondicao(builder.value));
  }

  return (
    <div className={cn("fl-popover", builder.value.rows.length > 1 && "fl-popover--largo")}>
      <p className="fl-popover-titulo">
        Ir para <strong>{destino?.name}</strong> quando:
      </p>

      <ConditionBuilder
        doc={doc}
        value={builder.value}
        campos={campos}
        irrepresentavel={builder.irrepresentavel}
        onChange={(value) => setBuilder({ value, irrepresentavel: builder.irrepresentavel })}
        onDescartarIrrepresentavel={() =>
          setBuilder({ value: condicaoParaBuilder(undefined, campos[0]).value, irrepresentavel: null })
        }
      />

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
        <Button
          size="sm"
          onClick={salvar}
          disabled={!!builder.irrepresentavel || semLinhas || semValor}
        >
          Salvar
        </Button>
      </div>
    </div>
  );
}
