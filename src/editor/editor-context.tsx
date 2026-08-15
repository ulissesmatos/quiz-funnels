"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useStore } from "zustand";

import type { FunnelDocument } from "@/funnel/schema";
import { saveFunnelDocumentAction } from "@/server/funnels/actions";

import { createEditorStore, type EditorState } from "./store";

type StoreApi = ReturnType<typeof createEditorStore>;

const EditorStoreContext = createContext<StoreApi | null>(null);

const AUTOSAVE_DELAY_MS = 900;

export function EditorProvider({
  funnelId,
  document,
  children,
}: {
  funnelId: string;
  document: FunnelDocument;
  children: ReactNode;
}) {
  // `useState` com inicializador preguiçoso, e não `useRef`: o store é criado
  // uma vez só e precisa ser lido durante o render, que é justamente o que uma
  // ref não deve fazer.
  const [store] = useState(() => createEditorStore(funnelId, document));

  useAutosave(store);

  return <EditorStoreContext.Provider value={store}>{children}</EditorStoreContext.Provider>;
}

export function useEditor<T>(selector: (state: EditorState) => T): T {
  const store = useContext(EditorStoreContext);
  if (!store) throw new Error("useEditor precisa estar dentro de <EditorProvider>");
  return useStore(store, selector);
}

/** Acesso ao store cru, para ler o estado atual dentro de callbacks. */
export function useEditorStore(): StoreApi {
  const store = useContext(EditorStoreContext);
  if (!store) throw new Error("useEditorStore precisa estar dentro de <EditorProvider>");
  return store;
}

/** Atalhos de teclado do editor. */
export function useEditorShortcuts() {
  const store = useEditorStore();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const alvo = event.target as HTMLElement | null;
      const digitando =
        alvo?.tagName === "INPUT" || alvo?.tagName === "TEXTAREA" || alvo?.isContentEditable;

      const meta = event.metaKey || event.ctrlKey;
      if (!meta) return;

      if (event.key.toLowerCase() === "z") {
        // Desfazer dentro de um campo de texto é do navegador, não do editor.
        if (digitando) return;
        event.preventDefault();
        if (event.shiftKey) store.getState().redo();
        else store.getState().undo();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [store]);
}

/**
 * Autosave com debounce.
 *
 * Salva o documento inteiro, não um diff: ele é um `jsonb` só, o custo é baixo,
 * e evita a classe inteira de bugs de patch fora de ordem.
 */
function useAutosave(store: StoreApi) {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let emVoo = false;

    const agendar = () => {
      clearTimeout(timer);
      timer = setTimeout(salvar, AUTOSAVE_DELAY_MS);
    };

    const salvar = async () => {
      const { doc, funnelId, saveStatus } = store.getState();
      if (saveStatus !== "pendente" || emVoo) return;

      emVoo = true;
      store.getState().setSaveStatus("salvando");

      try {
        const resultado = await saveFunnelDocumentAction(funnelId, doc);

        // Se editaram durante o salvamento, o documento em voo já é antigo:
        // marcar como pendente faz o próximo ciclo cobrir a diferença.
        const mudouNoCaminho = store.getState().doc !== doc;

        if (!resultado.ok) store.getState().setSaveStatus("erro", resultado.error);
        else if (mudouNoCaminho) {
          store.getState().setSaveStatus("pendente");
          agendar();
        } else store.getState().setSaveStatus("salvo");
      } catch {
        store.getState().setSaveStatus("erro", "Falha de conexão ao salvar.");
      } finally {
        emVoo = false;
      }
    };

    const unsubscribe = store.subscribe((state, anterior) => {
      if (state.doc !== anterior.doc) agendar();
    });

    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, [store]);

  // Avisa antes de fechar a aba com alteração ainda não salva.
  useEffect(() => {
    function onBeforeUnload(event: BeforeUnloadEvent) {
      const status = store.getState().saveStatus;
      if (status === "pendente" || status === "salvando") event.preventDefault();
    }

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [store]);
}

/** Step selecionado, já resolvido para o objeto. */
export function useSelectedStep() {
  return useEditor((state) => {
    const doc = state.doc;
    return doc.steps.find((s) => s.id === state.selectedStepId) ?? doc.steps[0];
  });
}

export function useSelectedBlock() {
  return useEditor((state) => {
    if (!state.selectedBlockId) return null;

    for (const step of state.doc.steps) {
      for (const block of step.blocks) {
        if (block.id === state.selectedBlockId) return block;
        if (block.type === "container") {
          const child = block.props.children.find((c) => c.id === state.selectedBlockId);
          if (child) return child;
        }
      }
    }

    return null;
  });
}

export const useDocument = () => useEditor((state) => state.doc);
