"use client";

import { useState, useTransition } from "react";

import type { ThemeMode } from "@/funnel/schema/theme";
import { cn } from "@/lib/cn";
import { updateDefaultThemeModeAction } from "@/server/settings/actions";

const MODOS: { valor: ThemeMode; rotulo: string; dica: string }[] = [
  { valor: "dark", rotulo: "Escuro", dica: "Painel e editor no escuro. Funis novos também nascem nesse modo." },
  { valor: "light", rotulo: "Claro", dica: "Painel e editor no claro. Funis novos também nascem nesse modo." },
  {
    valor: "auto",
    rotulo: "Automático",
    dica: "Painel e editor seguem o sistema deste computador. Funis novos também nascem assim.",
  },
];

export function ThemeModeForm({ inicial }: { inicial: ThemeMode }) {
  const [modo, setModo] = useState(inicial);
  const [pending, startTransition] = useTransition();
  const [salvo, setSalvo] = useState(false);

  function escolher(valor: ThemeMode) {
    if (valor === modo) return;
    setModo(valor);
    setSalvo(false);
    startTransition(async () => {
      await updateDefaultThemeModeAction(valor);
      setSalvo(true);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid max-w-md grid-cols-3 gap-2">
        {MODOS.map(({ valor, rotulo, dica }) => (
          <button
            key={valor}
            type="button"
            title={dica}
            disabled={pending}
            onClick={() => escolher(valor)}
            className={cn(
              "rounded-lg border px-3 py-2.5 text-sm transition-colors disabled:opacity-60",
              modo === valor
                ? "border-app-primary text-app-text"
                : "border-app-border text-app-muted hover:border-app-primary/60 hover:text-app-text",
            )}
          >
            {rotulo}
          </button>
        ))}
      </div>
      <p className="text-xs text-app-muted">
        {MODOS.find((m) => m.valor === modo)?.dica}
        {salvo && !pending && " Salvo."}
      </p>
    </div>
  );
}
