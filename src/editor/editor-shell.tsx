"use client";

import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { Blocks, Layers, SlidersHorizontal } from "lucide-react";
import { useEffect, useState } from "react";

import { createBlock } from "@/funnel/ops";
import { getBlockDefinition } from "@/funnel/schema/block";
import type { FunnelDocument } from "@/funnel/schema";
import { cn } from "@/lib/cn";

import { AI_KICKOFF_STORAGE_KEY, type AiPrefill } from "./ai-kickoff";
import { Canvas } from "./canvas";
import { EditorProvider, useEditor, useEditorShortcuts, useEditorStore } from "./editor-context";
import { FlowCanvas } from "./flow/flow-canvas";
import { Inspector, type Aba as AbaInspector } from "./inspector";
import { Palette, PALETTE_PREFIX } from "./palette";
import { StepsPanel } from "./steps-panel";
import { Topbar } from "./topbar";

type PainelMobile = "canvas" | "estrutura" | "ajustes";
export type Vista = "construtor" | "fluxo";

export function EditorShell({
  funnelId,
  document,
}: {
  funnelId: string;
  document: FunnelDocument;
}) {
  return (
    <EditorProvider funnelId={funnelId} document={document}>
      <EditorLayout funnelId={funnelId} />
    </EditorProvider>
  );
}

function EditorLayout({ funnelId }: { funnelId: string }) {
  const store = useEditorStore();
  useEditorShortcuts();

  const [painelMobile, setPainelMobile] = useState<PainelMobile>("canvas");
  const [abaInspector, setAbaInspector] = useState<AbaInspector>("bloco");
  const [arrastando, setArrastando] = useState<string | null>(null);
  const [vista, setVista] = useState<Vista>("construtor");
  const [abaEsquerda, setAbaEsquerda] = useState<"telas" | "elementos">("telas");
  const [aiPrefill, setAiPrefill] = useState<AiPrefill | null>(null);
  const selectedBlockId = useEditor((s) => s.selectedBlockId);

  const fecharGaveta = () => setPainelMobile("canvas");

  // Selecionar um bloco sem ver as propriedades dele é um passo extra sem
  // motivo — troca pra aba certa sozinho, de qualquer lugar que selecione um
  // bloco (canvas, paleta, IA).
  useEffect(() => {
    if (!selectedBlockId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sincroniza com o bloco selecionado no store
    setAbaInspector("bloco");
  }, [selectedBlockId]);

  // Pedido de IA feito no modal de criação do funil: já cai aqui pedindo pro
  // copiloto rodar sozinho, sem a pessoa ter que digitar de novo.
  useEffect(() => {
    const pedido = window.sessionStorage.getItem(AI_KICKOFF_STORAGE_KEY);
    if (!pedido) return;

    window.sessionStorage.removeItem(AI_KICKOFF_STORAGE_KEY);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- leitura única de estado externo (sessionStorage)
    setAbaInspector("ia");
    setAiPrefill({ texto: pedido });
  }, []);

  /**
   * `distance`/`delay` evitam que um toque para selecionar vire um arrasto
   * acidental. No touch o atraso é o que permite rolar a página normalmente
   * sem o dnd sequestrar o gesto.
   */
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
  );

  function onDragStart(event: DragStartEvent) {
    setArrastando(String(event.active.id));
  }

  function onDragEnd(event: DragEndEvent) {
    setArrastando(null);

    const { active, over } = event;
    const estado = store.getState();
    const step = estado.doc.steps.find((s) => s.id === estado.selectedStepId);
    if (!step) return;

    const activeId = String(active.id);
    const overId = over ? String(over.id) : null;

    const destino = overId ? step.blocks.findIndex((b) => b.id === overId) : -1;

    // Veio da paleta: cria o bloco e insere na posição onde foi solto.
    if (activeId.startsWith(PALETTE_PREFIX)) {
      const tipo = activeId.slice(PALETTE_PREFIX.length);
      const bloco = createBlock(estado.doc, tipo);
      if (!bloco) return;

      estado.dispatch(
        {
          type: "add_block",
          stepId: step.id,
          block: bloco,
          index: destino === -1 ? undefined : destino,
        },
        { label: `Adicionar ${getBlockDefinition(tipo)?.label ?? "bloco"}` },
      );
      estado.selectBlock(bloco.id);
      return;
    }

    // Reordenação dentro da tela.
    if (!overId || activeId === overId || destino === -1) return;

    estado.dispatch(
      { type: "move_block", blockId: activeId, toStepId: step.id, toIndex: destino },
      { label: "Reordenar blocos" },
    );
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setArrastando(null)}
      modifiers={arrastando?.startsWith(PALETTE_PREFIX) ? [] : [restrictToVerticalAxis]}
    >
      <div className="flex h-dvh flex-col overflow-hidden">
        <Topbar funnelId={funnelId} vista={vista} onVistaChange={setVista} />

        <div className="relative flex min-h-0 flex-1">
          {/*
            Cada painel existe uma única vez na árvore e só muda de forma: no
            desktop é coluna fixa, no celular vira uma gaveta por cima do
            canvas. Renderizar duas cópias (uma por breakpoint) duplicaria os
            campos do inspector no DOM, com ids repetidos e leitura de tela
            confusa.
          */}
          <PainelLateral
            lado="esquerda"
            aberto={painelMobile === "estrutura"}
            onFechar={fecharGaveta}
          >
            {/* Telas e elementos em abas: empilhados, um funil de 26 telas
                empurrava a paleta para fora da vista. */}
            <div className="flex shrink-0 gap-1 rounded-lg bg-app-surface-2 p-1">
              {(
                [
                  { chave: "telas", rotulo: "Telas", Icone: Layers },
                  { chave: "elementos", rotulo: "Elementos", Icone: Blocks },
                ] as const
              ).map(({ chave, rotulo, Icone }) => (
                <button
                  key={chave}
                  type="button"
                  onClick={() => setAbaEsquerda(chave)}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs transition-colors",
                    abaEsquerda === chave
                      ? "bg-app-surface text-app-text"
                      : "text-app-muted hover:text-app-text",
                  )}
                >
                  <Icone size={13} />
                  {rotulo}
                </button>
              ))}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {abaEsquerda === "telas" ? (
                <StepsPanel onTelaSelecionada={fecharGaveta} />
              ) : (
                <Palette onBlocoAdicionado={fecharGaveta} />
              )}
            </div>
          </PainelLateral>

          <main className="flex min-w-0 flex-1 flex-col">
            {vista === "construtor" ? (
              <Canvas />
            ) : (
              <FlowCanvas
                onAbrirTela={(stepId) => {
                  store.getState().selectStep(stepId);
                  setVista("construtor");
                }}
              />
            )}
          </main>

          <PainelLateral lado="direita" aberto={painelMobile === "ajustes"} onFechar={fecharGaveta}>
            <Inspector
              aba={abaInspector}
              onAbaChange={setAbaInspector}
              aiPrefill={aiPrefill}
              onAiPrefillConsumed={() => setAiPrefill(null)}
            />
          </PainelLateral>
        </div>

        <nav className="flex shrink-0 border-t border-app-border bg-app-surface lg:hidden">
          {(
            [
              { chave: "estrutura", rotulo: "Telas e blocos", Icone: Blocks },
              { chave: "ajustes", rotulo: "Ajustes", Icone: SlidersHorizontal },
            ] as const
          ).map(({ chave, rotulo, Icone }) => (
            <button
              key={chave}
              type="button"
              onClick={() => setPainelMobile(painelMobile === chave ? "canvas" : chave)}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] transition-colors",
                painelMobile === chave ? "text-app-primary" : "text-app-muted",
              )}
            >
              <Icone size={17} />
              {rotulo}
            </button>
          ))}
        </nav>
      </div>

      <DragOverlay dropAnimation={null}>
        {arrastando?.startsWith(PALETTE_PREFIX) ? (
          <div className="ed-drag-preview">
            {getBlockDefinition(arrastando.slice(PALETTE_PREFIX.length))?.label ?? "Bloco"}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

/**
 * Coluna no desktop, gaveta inferior no celular — sempre a mesma instância dos
 * filhos, só reposicionada por CSS.
 */
function PainelLateral({
  lado,
  aberto,
  onFechar,
  children,
}: {
  lado: "esquerda" | "direita";
  aberto: boolean;
  onFechar: () => void;
  children: React.ReactNode;
}) {
  return (
    <>
      {aberto && (
        <button
          type="button"
          aria-label="Fechar painel"
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onFechar}
        />
      )}

      <aside
        className={cn(
          // A rolagem é de quem está dentro, não do painel: assim o cabeçalho
          // de abas fica parado enquanto a lista rola.
          "flex flex-col gap-3 overflow-hidden bg-app-surface",
          // Celular: gaveta ancorada no rodapé, acima da barra de navegação.
          "fixed inset-x-0 bottom-[52px] z-50 max-h-[70dvh] rounded-t-2xl border-t border-app-border p-3",
          aberto ? "flex" : "hidden",
          // Desktop: volta a ser coluna no fluxo normal.
          "lg:static lg:z-auto lg:flex lg:max-h-none lg:w-64 lg:rounded-none lg:border-t-0 lg:p-3",
          lado === "esquerda"
            ? "lg:shrink-0 lg:border-r lg:border-app-border"
            : "lg:w-72 lg:shrink-0 lg:gap-0 lg:border-l lg:border-app-border lg:p-0",
        )}
      >
        {children}
      </aside>
    </>
  );
}
