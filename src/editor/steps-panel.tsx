"use client";

import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";

import { createStep } from "@/funnel/ops";
import type { StepType } from "@/funnel/schema/step";
import { cn } from "@/lib/cn";

import { useDocument, useEditor, useEditorStore } from "./editor-context";

const ICONES_POR_TIPO: Record<StepType, string> = {
  question: "❓",
  content: "📄",
  loading: "⏳",
  result: "✨",
  form: "📝",
  checkout: "🛒",
};

export function StepsPanel({ onTelaSelecionada }: { onTelaSelecionada?: () => void }) {
  const doc = useDocument();
  const store = useEditorStore();
  const selectedStepId = useEditor((s) => s.selectedStepId);
  const selectStep = useEditor((s) => s.selectStep);
  const dispatch = useEditor((s) => s.dispatch);

  function adicionarStep() {
    const step = createStep(store.getState().doc, "question");
    dispatch({ type: "add_step", step, afterStepId: selectedStepId }, { label: "Nova tela" });
    selectStep(step.id);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-xs font-medium tracking-wide text-app-muted uppercase">
          Telas ({doc.steps.length})
        </h3>
        <button
          type="button"
          onClick={adicionarStep}
          className="flex items-center gap-1 rounded-md px-1.5 py-1 text-xs text-app-muted hover:bg-app-surface-2 hover:text-app-text"
        >
          <Plus size={13} /> Nova
        </button>
      </div>

      <ol className="flex flex-col gap-1">
        {doc.steps.map((step, index) => {
          const ativo = step.id === selectedStepId;

          return (
            <li key={step.id}>
              <div
                className={cn(
                  "group flex items-center gap-2 rounded-lg border px-2 py-1.5 transition-colors",
                  ativo
                    ? "border-app-primary bg-app-primary/10"
                    : "border-transparent hover:bg-app-surface-2",
                )}
              >
                <button
                  type="button"
                  onClick={() => {
                    selectStep(step.id);
                    onTelaSelecionada?.();
                  }}
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                >
                  <span className="text-sm" aria-hidden>
                    {ICONES_POR_TIPO[step.type]}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">{step.name}</span>
                    <span className="block text-[11px] text-app-muted">
                      {index + 1} · {step.blocks.length}{" "}
                      {step.blocks.length === 1 ? "bloco" : "blocos"}
                    </span>
                  </span>
                </button>

                <div className="flex shrink-0 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                  <IconButton
                    label={`Subir ${step.name}`}
                    disabled={index === 0}
                    onClick={() =>
                      dispatch(
                        { type: "move_step", stepId: step.id, toIndex: index - 1 },
                        { label: "Reordenar telas" },
                      )
                    }
                  >
                    <ChevronUp size={13} />
                  </IconButton>

                  <IconButton
                    label={`Descer ${step.name}`}
                    disabled={index === doc.steps.length - 1}
                    onClick={() =>
                      dispatch(
                        { type: "move_step", stepId: step.id, toIndex: index + 1 },
                        { label: "Reordenar telas" },
                      )
                    }
                  >
                    <ChevronDown size={13} />
                  </IconButton>

                  <IconButton
                    label={`Excluir ${step.name}`}
                    disabled={doc.steps.length <= 1}
                    danger
                    onClick={() => {
                      dispatch({ type: "remove_step", stepId: step.id }, { label: "Excluir tela" });
                      if (ativo) {
                        const restantes = store.getState().doc.steps;
                        selectStep(restantes[Math.min(index, restantes.length - 1)].id);
                      }
                    }}
                  >
                    <Trash2 size={13} />
                  </IconButton>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "grid h-6 w-6 place-items-center rounded-md text-app-muted transition-colors",
        "hover:bg-app-border hover:text-app-text disabled:opacity-25 disabled:hover:bg-transparent",
        danger && "hover:bg-app-danger/20 hover:text-app-danger",
      )}
    >
      {children}
    </button>
  );
}
