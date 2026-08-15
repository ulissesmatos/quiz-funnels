"use client";

import { useDraggable } from "@dnd-kit/core";
import { icons } from "lucide-react";
import { useMemo } from "react";

import { createBlock } from "@/funnel/ops";
import { allBlockDefinitions } from "@/funnel/schema/block";
import { blockCategories, type BlockCategory } from "@/funnel/blocks/types";
import { cn } from "@/lib/cn";

import { useEditor, useEditorStore } from "./editor-context";

/** Prefixo que distingue um item da paleta de um bloco já no canvas. */
export const PALETTE_PREFIX = "palette:";

/**
 * Paleta de blocos, montada a partir do registro — bloco novo aparece aqui
 * sozinho, sem tocar neste arquivo.
 *
 * Cada item pode ser arrastado **ou** tocado. O toque não é um atalho: em tela
 * pequena, arrastar de um painel para o canvas é desconfortável, e sem essa
 * alternativa o editor ficaria ruim justamente no dispositivo em que a maioria
 * dos funis é feita.
 */
export function Palette({ onBlocoAdicionado }: { onBlocoAdicionado?: () => void }) {
  // Percorre as categorias na ordem declarada em `blockCategories`, não na
  // ordem em que os blocos aparecem no registro: é o que mantém os básicos no
  // topo e o repertório avançado agrupado embaixo.
  const grupos = useMemo(() => {
    const chaves = Object.keys(blockCategories) as BlockCategory[];

    return chaves
      .map((categoria) => [categoria, allBlockDefinitions.filter((d) => d.category === categoria)] as const)
      .filter(([, definicoes]) => definicoes.length > 0);
  }, []);

  return (
    <div className="flex flex-col gap-4">
      {grupos.map(([categoria, definicoes]) => (
        <section key={categoria}>
          <h3 className="mb-2 px-1 text-xs font-medium tracking-wide text-app-muted uppercase">
            {blockCategories[categoria]}
          </h3>
          <div className="grid grid-cols-2 gap-1.5">
            {definicoes.map((definition) => (
              <PaletteItem
                key={definition.type}
                type={definition.type}
                label={definition.label}
                icon={definition.icon}
                description={definition.description}
                onAdicionado={onBlocoAdicionado}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function PaletteItem({
  type,
  label,
  icon,
  description,
  onAdicionado,
}: {
  type: string;
  label: string;
  icon: string;
  description: string;
  onAdicionado?: () => void;
}) {
  const store = useEditorStore();
  const dispatch = useEditor((s) => s.dispatch);
  const selectBlock = useEditor((s) => s.selectBlock);

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `${PALETTE_PREFIX}${type}`,
    data: { paletteType: type },
  });

  const Icon = icons[icon as keyof typeof icons];

  function adicionarNoFim() {
    const { doc, selectedStepId } = store.getState();

    const block = createBlock(doc, type);
    if (!block) return;

    dispatch(
      { type: "add_block", stepId: selectedStepId, block },
      { label: `Adicionar ${label.toLowerCase()}` },
    );
    selectBlock(block.id);

    // No celular a paleta é uma gaveta sobre o canvas: mantê-la aberta
    // esconderia justamente o bloco que a pessoa acabou de inserir.
    onAdicionado?.();
  }

  return (
    <button
      ref={setNodeRef}
      type="button"
      title={description}
      onClick={adicionarNoFim}
      className={cn(
        "flex cursor-grab touch-none flex-col items-start gap-1.5 rounded-lg border border-app-border bg-app-surface-2 px-2.5 py-2 text-left transition-colors hover:border-app-primary/60 active:cursor-grabbing",
        isDragging && "opacity-40",
      )}
      {...attributes}
      {...listeners}
    >
      {Icon && <Icon size={15} className="text-app-muted" />}
      <span className="text-xs leading-tight">{label}</span>
    </button>
  );
}
