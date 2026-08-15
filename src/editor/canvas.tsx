"use client";

import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Copy, EyeOff, GripVertical, Trash2 } from "lucide-react";
import { useMemo, type CSSProperties } from "react";

import { BlockView } from "@/funnel/render/block-view";
import { FunnelRuntimeProvider, type FunnelRuntime } from "@/funnel/render/runtime-context";
import { createContext as createFunnelContext } from "@/funnel/logic/context";
import { computeScores } from "@/funnel/logic/scoring";
import type { Block } from "@/funnel/schema/block";
import { separarBlocosFixos } from "@/funnel/render/step-layout";
import { resolveColor, resolveSpace, themeToCssVars } from "@/funnel/theme/css";
import { cn } from "@/lib/cn";

import { useDocument, useEditor } from "./editor-context";

import "@/funnel/render/funnel.css";
import "./canvas.css";

/**
 * Canvas do editor.
 *
 * Renderiza os blocos com exatamente o mesmo componente do funil público — o
 * que se vê aqui é o que vai ao ar, sem uma segunda implementação de aparência
 * para manter em dia. O que muda é só a camada por cima: alça de arrastar,
 * contorno de seleção e estado vazio.
 */
export function Canvas() {
  const doc = useDocument();
  const viewport = useEditor((s) => s.viewport);
  const selectedStepId = useEditor((s) => s.selectedStepId);
  const selectedBlockId = useEditor((s) => s.selectedBlockId);
  const highlighted = useEditor((s) => s.highlightedBlockIds);
  const selectBlock = useEditor((s) => s.selectBlock);

  const step = doc.steps.find((s) => s.id === selectedStepId) ?? doc.steps[0];

  /**
   * Runtime inerte: os blocos precisam de contexto para interpolar `{{nome}}`
   * e ler o progresso, mas clicar no canvas seleciona em vez de navegar.
   */
  const runtime: FunnelRuntime = useMemo(() => {
    const stepIndex = Math.max(
      0,
      doc.steps.findIndex((s) => s.id === step?.id),
    );

    return {
      context: {
        ...createFunnelContext(doc),
        answers: exemploDeRespostas(doc),
        scores: computeScores(doc, {}),
        stepIndex,
        stepCount: doc.steps.length,
      },
      setAnswer: () => {},
      answerAndAdvance: () => {},
      runAction: () => {},
      next: () => {},
      back: () => {},
      canGoBack: stepIndex > 0,
      errors: {},
      interactive: false,
    };
  }, [doc, step?.id]);

  if (!step) return null;

  const background = step.layout.background;
  const { fixos, fluxo } = separarBlocosFixos(step.blocks);

  const stepStyle: CSSProperties = {
    backgroundColor: resolveColor(background?.color),
    backgroundImage: background?.image?.url ? `url("${background.image.url}")` : undefined,
    paddingBlock: resolveSpace(step.layout.paddingY),
  };

  return (
    <div className="ed-canvas-scroll" onClick={() => selectBlock(null)}>
      <div className={cn("ed-canvas-frame", `ed-canvas-frame--${viewport}`)}>
        <div className="fn-root" style={themeToCssVars(doc.theme)}>
          <FunnelRuntimeProvider value={runtime}>
            <div className="fn-step-wrapper">
              {background?.image?.url && background.overlay ? (
                <div className="fn-step-overlay" style={{ opacity: background.overlay }} />
              ) : null}

              <section
                className="fn-step"
                data-align={step.layout.align}
                data-full-height={step.layout.fullHeight}
                style={stepStyle}
              >
                {/* Um único SortableContext cobrindo cabeçalho e fluxo: a
                    ordenação continua sendo a da lista do documento, mesmo com
                    os blocos fixos renderizados fora do container central. */}
                <SortableContext
                  items={step.blocks.map((b) => b.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {fixos.length > 0 && (
                    <div className="fn-step-header">
                      {fixos.map((block) => (
                        <CanvasBlock
                          key={block.id}
                          block={block}
                          selected={block.id === selectedBlockId}
                          highlighted={highlighted.includes(block.id)}
                        />
                      ))}
                    </div>
                  )}

                  <div className="fn-step-inner">
                    {fluxo.map((block) => (
                      <CanvasBlock
                        key={block.id}
                        block={block}
                        selected={block.id === selectedBlockId}
                        highlighted={highlighted.includes(block.id)}
                      />
                    ))}

                    {step.blocks.length === 0 && (
                      <div className="ed-empty">
                        <p>Esta tela está vazia.</p>
                        <p className="ed-empty-hint">
                          Toque em um bloco na paleta ou arraste-o para cá.
                        </p>
                      </div>
                    )}
                  </div>
                </SortableContext>
              </section>
            </div>
          </FunnelRuntimeProvider>
        </div>
      </div>
    </div>
  );
}

function CanvasBlock({
  block,
  selected,
  highlighted,
}: {
  block: Block;
  selected: boolean;
  highlighted: boolean;
}) {
  const doc = useDocument();
  const selectBlock = useEditor((s) => s.selectBlock);
  const dispatch = useEditor((s) => s.dispatch);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
  });

  const style: CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  const rotulo = rotuloDoBloco(block);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "ed-block",
        selected && "ed-block--selected",
        highlighted && "ed-block--highlighted",
        isDragging && "ed-block--dragging",
      )}
      data-block-id={block.id}
      onClick={(event) => {
        event.stopPropagation();
        selectBlock(block.id);
      }}
    >
      {/* Sem este selo, um bloco com condição parece ter sumido sem motivo —
          ele só não aparece para quem não bate a condição. */}
      {block.visibleIf && (
        <span className="ed-block-flag" title="Só aparece quando a condição for verdadeira">
          <EyeOff size={11} />
          Condicional
        </span>
      )}

      <div className="ed-block-toolbar">
        <button
          type="button"
          className="ed-block-handle"
          aria-label={`Mover ${rotulo}`}
          {...attributes}
          {...listeners}
        >
          <GripVertical size={14} />
        </button>
        <span className="ed-block-label">{rotulo}</span>
        <button
          type="button"
          className="ed-block-action"
          aria-label={`Duplicar ${rotulo}`}
          onClick={(event) => {
            event.stopPropagation();
            dispatch({ type: "duplicate_block", blockId: block.id }, { label: "Duplicar bloco" });
          }}
        >
          <Copy size={13} />
        </button>
        <button
          type="button"
          className="ed-block-action ed-block-action--danger"
          aria-label={`Excluir ${rotulo}`}
          onClick={(event) => {
            event.stopPropagation();
            dispatch({ type: "remove_block", blockId: block.id }, { label: "Excluir bloco" });
          }}
        >
          <Trash2 size={13} />
        </button>
      </div>

      {/* `pointer-events: none` por CSS: o clique é do canvas, não do bloco. */}
      <div className="ed-block-content">
        <BlockView block={block} theme={doc.theme} />
      </div>
    </div>
  );
}

function rotuloDoBloco(block: Block): string {
  switch (block.type) {
    case "heading":
      return "Título";
    case "text":
      return "Texto";
    case "choice":
      return `Opções · ${block.props.name}`;
    case "input":
      return `Campo · ${block.props.name}`;
    case "button":
      return "Botão";
    case "image":
      return "Imagem";
    case "video":
      return "Vídeo";
    case "list":
      return "Lista";
    case "loader":
      return "Carregando";
    case "result":
      return "Resultado";
    case "progress":
      return "Progresso";
    case "divider":
      return "Divisor";
    case "spacer":
      return "Espaço";
    case "container":
      return "Colunas";
    default:
      return "Bloco";
  }
}

/**
 * Preenche as variáveis com o próprio nome entre chaves visíveis, para o autor
 * enxergar onde a interpolação entra sem precisar simular uma resposta.
 */
function exemploDeRespostas(doc: { steps: { blocks: Block[] }[] }) {
  const respostas: Record<string, string> = {};

  for (const step of doc.steps) {
    for (const block of step.blocks) {
      if (block.type === "input") respostas[block.props.name] = `[${block.props.name}]`;
      if (block.type === "choice") {
        respostas[block.props.name] = block.props.options[0]?.label ?? "";
      }
    }
  }

  return respostas;
}
