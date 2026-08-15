"use client";

import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Copy, EyeOff, GripVertical, Trash2 } from "lucide-react";
import { useMemo, type CSSProperties } from "react";

import { evaluateCondition } from "@/funnel/logic/conditions";
import { BlockView } from "@/funnel/render/block-view";
import { FunnelRuntimeProvider, useFunnelRuntime, type FunnelRuntime } from "@/funnel/render/runtime-context";
import { createContext as createFunnelContext } from "@/funnel/logic/context";
import { computeScores } from "@/funnel/logic/scoring";
import type { Block } from "@/funnel/schema/block";
import { separarBlocosFixos } from "@/funnel/render/step-layout";
import { getBlockDefinition } from "@/funnel/schema/block";
import { customFontFaces, googleFontsHref, resolveColor, resolveSpace, themeToCssVars } from "@/funnel/theme/css";
import { Icon } from "@/components/ui/icon";
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
      mode: "editor",
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

  const fontsHref = googleFontsHref(doc.theme);
  const fontFaces = customFontFaces(doc.theme);

  return (
    <div className="ed-canvas-scroll" onClick={() => selectBlock(null)}>
      {/*
        Igual ao funil público: sem isto, trocar a fonte no painel Tema muda a
        CSS variable mas o navegador nunca baixa a fonte escolhida, e o canvas
        continua mostrando a fonte anterior sem nenhum aviso. O React 19 hoista
        `<link>`/`<style>` para o `<head>` mesmo saindo de um client component.
      */}
      {fontsHref && (
        <>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
          <link rel="stylesheet" href={fontsHref} />
        </>
      )}
      {fontFaces && <style>{fontFaces}</style>}
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
  const { context } = useFunnelRuntime();

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
  });

  const style: CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  const rotulo = rotuloDoBloco(block);

  // A definição diz quando o bloco não tem nada visível para desenhar.
  const definition = getBlockDefinition(block.type);
  const vazio = definition?.emptyState?.(block.props as never) ?? null;

  // Com as respostas de exemplo do canvas (não uma resposta real), só serve
  // de indicação — mas evita que o bloco condicional pareça ter sumido: em vez
  // de desenhar nada, mostra o próprio conteúdo apagado com o aviso do porquê.
  const condicaoAtendida = evaluateCondition(block.visibleIf, context);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "ed-block",
        selected && "ed-block--selected",
        highlighted && "ed-block--highlighted",
        isDragging && "ed-block--dragging",
        !condicaoAtendida && "ed-block--condicao-oculta",
      )}
      data-block-id={block.id}
      onClick={(event) => {
        event.stopPropagation();
        selectBlock(block.id);
      }}
    >
      {/* Sem este selo, um bloco com condição parece ter sumido sem motivo —
          ele só não aparece para quem não bate a condição. Continua desenhado
          por baixo, apagado, para dar pra editar mesmo assim. */}
      {block.visibleIf && (
        <span
          className={cn("ed-block-flag", !condicaoAtendida && "ed-block-flag--oculto")}
          title={
            condicaoAtendida
              ? "Este bloco só aparece quando a condição for verdadeira — no exemplo atual, ela bate"
              : "Este bloco só aparece quando a condição for verdadeira — no exemplo atual, ela não bate, então ficaria oculto"
          }
        >
          <EyeOff size={11} />
          {condicaoAtendida ? "Condicional" : "Condicional · oculto no exemplo"}
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
        {vazio ? (
          <MarcadorDeBlocoVazio tipo={block.type} rotulo={rotulo} mensagem={vazio} />
        ) : (
          <BlockView block={block} theme={doc.theme} />
        )}
      </div>
    </div>
  );
}

/**
 * Marcador para um bloco que não desenha nada.
 *
 * Sem ele, inserir um confetti ou um espaço parece não ter feito nada, e a
 * pessoa insere de novo. Existe só no editor: no funil publicado, a ausência é
 * exatamente o comportamento certo.
 */
function MarcadorDeBlocoVazio({
  tipo,
  rotulo,
  mensagem,
}: {
  tipo: string;
  rotulo: string;
  mensagem: string;
}) {
  const definition = getBlockDefinition(tipo);

  return (
    <div className="ed-vazio">
      <Icon name={definition?.icon ?? "Square"} size={16} className="ed-vazio-icone" />
      <span className="ed-vazio-texto">
        <strong>{rotulo}</strong>
        {mensagem}
      </span>
    </div>
  );
}

/**
 * Nome do bloco na barra de ações.
 *
 * Vem do registro, não de um `switch` à mão: a lista escrita separadamente
 * envelhecia a cada bloco novo e ficava mostrando "Bloco" para os recentes.
 * Campos ganham o nome da variável junto, que é o que distingue um do outro
 * quando há vários na mesma tela.
 */
function rotuloDoBloco(block: Block): string {
  const label = getBlockDefinition(block.type)?.label ?? "Bloco";

  if (block.type === "choice" || block.type === "input") {
    return `${label} · ${block.props.name}`;
  }

  return label;
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
