"use client";

import { EyeOff } from "lucide-react";

import type { Block } from "@/funnel/schema/block";
import { cn } from "@/lib/cn";

import { ConditionBuilder } from "./condition-builder";
import { builderParaCondicao, condicaoParaBuilder } from "./condition-builder-utils";
import { camposDisponiveis } from "./condition-fields";
import { useDocument, useEditor, useSelectedStep } from "./editor-context";

/**
 * Visibilidade condicional de um bloco.
 *
 * Antes só a IA conseguia mexer nisso (`set_block_visibility`); o badge em
 * `canvas.tsx` era só leitura. Aqui o mesmo campo (`Block.visibleIf`) fica
 * editável à mão, sem op novo — dispara `update_block` a cada mudança, igual
 * ao resto do painel do bloco.
 */
export function BlockVisibilitySection({ bloco }: { bloco: Block }) {
  const doc = useDocument();
  const step = useSelectedStep();
  const dispatch = useEditor((s) => s.dispatch);

  if (!step) return null;

  const campos = camposDisponiveis(doc, step.id);
  const condicional = bloco.visibleIf !== undefined;
  const { value, irrepresentavel } = condicaoParaBuilder(bloco.visibleIf, campos[0]);

  function aplicar(visibleIf: Block["visibleIf"] | null, mergeKey?: string) {
    dispatch(
      { type: "update_block", blockId: bloco.id, patch: { visibleIf } },
      { label: "Editar visibilidade condicional", mergeKey },
    );
  }

  function ativarCondicional() {
    if (condicional || campos.length === 0) return;
    // Sem valor escolhido ainda, a condição não bate para ninguém — o bloco
    // fica escondido até a pessoa terminar de configurar, o que é mais seguro
    // do que aparecer para todo mundo por engano.
    aplicar(builderParaCondicao(condicaoParaBuilder(undefined, campos[0]).value));
  }

  return (
    <div className="flex flex-col gap-2.5 border-t border-app-border pt-4">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-sm">
          <EyeOff size={13} className="text-app-muted" />
          Visibilidade
        </span>

        <div className="flex gap-0.5 rounded-lg bg-app-surface-2 p-0.5 text-xs">
          <button
            type="button"
            className={cn("rounded-md px-2 py-1 transition-colors", !condicional && "bg-app-surface text-app-text")}
            onClick={() => aplicar(null)}
          >
            Sempre visível
          </button>
          <button
            type="button"
            className={cn("rounded-md px-2 py-1 transition-colors", condicional && "bg-app-surface text-app-text")}
            onClick={ativarCondicional}
            disabled={campos.length === 0}
          >
            Condicional
          </button>
        </div>
      </div>

      {condicional && campos.length > 0 && (
        <ConditionBuilder
          doc={doc}
          value={value}
          campos={campos}
          irrepresentavel={irrepresentavel}
          onChange={(novoValor, motivo) =>
            aplicar(builderParaCondicao(novoValor), motivo === "valor" ? `${bloco.id}.visibleIf` : undefined)
          }
          onDescartarIrrepresentavel={() =>
            aplicar(builderParaCondicao(condicaoParaBuilder(undefined, campos[0]).value))
          }
        />
      )}

      {condicional && campos.length === 0 && (
        <p className="text-[11px] leading-snug text-app-muted">
          Esta tela não tem nenhuma pergunta antes dela para condicionar. Adicione um campo primeiro.
        </p>
      )}
    </div>
  );
}
