"use client";

import { create } from "zustand";

import { applyOp, applyOps, type FunnelOp } from "@/funnel/ops";
import type { FunnelDocument } from "@/funnel/schema";

export type SaveStatus = "salvo" | "salvando" | "pendente" | "erro";
export type Viewport = "mobile" | "desktop";

/**
 * Agrupa edições consecutivas num único passo de undo.
 * Digitar um título letra por letra tem que desfazer de uma vez só, não a cada
 * tecla — e uma resposta inteira da IA também vira um passo só.
 */
const MERGE_WINDOW_MS = 900;

type HistoryEntry = { doc: FunnelDocument; label: string };

export type EditorState = {
  funnelId: string;
  doc: FunnelDocument;

  selectedStepId: string;
  selectedBlockId: string | null;
  viewport: Viewport;

  past: HistoryEntry[];
  future: HistoryEntry[];
  lastMergeKey: string | null;
  lastEditAt: number;

  saveStatus: SaveStatus;
  saveError: string | null;

  /** Blocos que a IA acabou de tocar, para destacar no canvas. */
  highlightedBlockIds: string[];

  dispatch: (op: FunnelOp, options?: DispatchOptions) => void;
  dispatchMany: (ops: FunnelOp[], options?: DispatchOptions) => void;
  /** Substitui o documento inteiro (modelo pronto, ou operação do copiloto). */
  replaceDocument: (doc: FunnelDocument, options?: DispatchOptions) => void;

  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  selectStep: (stepId: string) => void;
  selectBlock: (blockId: string | null) => void;
  setViewport: (viewport: Viewport) => void;
  setSaveStatus: (status: SaveStatus, error?: string | null) => void;
  highlightBlocks: (blockIds: string[]) => void;
};

export type DispatchOptions = {
  label?: string;
  /**
   * Edições seguidas com a mesma chave viram um único passo de undo — use o
   * id do campo sendo editado, ex.: `blk_titulo.text`.
   */
  mergeKey?: string;
  /**
   * Janela de mesclagem. O copiloto passa `Infinity`: uma resposta da IA pode
   * levar meio minuto aplicando dezenas de operações, e desfazer isso tem que
   * ser um Ctrl+Z só, não trinta.
   */
  mergeWindowMs?: number;
  /** Não registra no histórico (mudanças de seleção, por exemplo). */
  skipHistory?: boolean;
};

const HISTORY_LIMIT = 100;

export function createEditorStore(funnelId: string, initialDocument: FunnelDocument) {
  return create<EditorState>((set, get) => ({
    funnelId,
    doc: initialDocument,

    selectedStepId: initialDocument.steps[0]?.id ?? "",
    selectedBlockId: null,
    viewport: "mobile",

    past: [],
    future: [],
    lastMergeKey: null,
    lastEditAt: 0,

    saveStatus: "salvo",
    saveError: null,
    highlightedBlockIds: [],

    dispatch: (op, options) => get().dispatchMany([op], options),

    dispatchMany: (ops, options = {}) => {
      const state = get();
      const nextDoc = applyOps(state.doc, ops);

      // Operação que não muda nada (id inexistente, valor igual) não deve
      // ocupar um passo de undo nem marcar o funil como pendente.
      if (nextDoc === state.doc) return;

      set(pushHistory(state, nextDoc, options));
    },

    replaceDocument: (doc, options = {}) => {
      const state = get();
      if (doc === state.doc) return;
      set(pushHistory(state, doc, options));
    },

    undo: () => {
      const { past, future, doc } = get();
      const previous = past[past.length - 1];
      if (!previous) return;

      set({
        doc: previous.doc,
        past: past.slice(0, -1),
        future: [{ doc, label: previous.label }, ...future].slice(0, HISTORY_LIMIT),
        saveStatus: "pendente",
        lastMergeKey: null,
      });
    },

    redo: () => {
      const { past, future, doc } = get();
      const next = future[0];
      if (!next) return;

      set({
        doc: next.doc,
        past: [...past, { doc, label: next.label }].slice(-HISTORY_LIMIT),
        future: future.slice(1),
        saveStatus: "pendente",
        lastMergeKey: null,
      });
    },

    canUndo: () => get().past.length > 0,
    canRedo: () => get().future.length > 0,

    selectStep: (stepId) => set({ selectedStepId: stepId, selectedBlockId: null }),
    selectBlock: (blockId) => set({ selectedBlockId: blockId }),
    setViewport: (viewport) => set({ viewport }),
    setSaveStatus: (saveStatus, saveError = null) => set({ saveStatus, saveError }),
    highlightBlocks: (highlightedBlockIds) => set({ highlightedBlockIds }),
  }));
}

function pushHistory(
  state: EditorState,
  nextDoc: FunnelDocument,
  options: DispatchOptions,
): Partial<EditorState> {
  const now = Date.now();

  const base: Partial<EditorState> = {
    doc: nextDoc,
    future: [],
    saveStatus: "pendente",
    saveError: null,
    lastEditAt: now,
    lastMergeKey: options.mergeKey ?? null,
  };

  if (options.skipHistory) return base;

  const mergeWithPrevious =
    options.mergeKey !== undefined &&
    options.mergeKey === state.lastMergeKey &&
    now - state.lastEditAt < (options.mergeWindowMs ?? MERGE_WINDOW_MS) &&
    state.past.length > 0;

  // Ao mesclar, o snapshot antigo continua sendo o ponto de retorno correto:
  // desfazer volta para antes da primeira tecla, não para a penúltima.
  const past = mergeWithPrevious
    ? state.past
    : [...state.past, { doc: state.doc, label: options.label ?? "Edição" }].slice(-HISTORY_LIMIT);

  return { ...base, past };
}

/** Aplica uma operação fora do store — útil em testes e no servidor. */
export { applyOp, applyOps };
