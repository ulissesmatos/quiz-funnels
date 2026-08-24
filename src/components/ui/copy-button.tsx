"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/cn";

/**
 * Copia um texto e confirma por 2s. A lógica estava duplicada em
 * `team-manager` (link de convite) e `webhooks-manager` (segredo).
 *
 * O timer é limpo no unmount: nas duas telas originais o componente pode sumir
 * enquanto o "Copiado" ainda está de pé (a linha é removida logo depois), e
 * `setState` num componente desmontado é um vazamento silencioso.
 */
export function CopyButton({
  value,
  label = "Copiar",
  className,
}: {
  value: string;
  label?: string;
  className?: string;
}) {
  const [copiado, setCopiado] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Clipboard bloqueado (contexto inseguro, permissão negada): não vale
      // quebrar a tela — o valor continua visível e selecionável ao lado.
      return;
    }
    setCopiado(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={copiar}
      className={cn(
        "flex shrink-0 items-center gap-1 rounded-md border border-app-border px-2 py-1 text-xs text-app-muted transition-colors duration-150 ease-app hover:border-app-primary/60 hover:text-app-text",
        className,
      )}
    >
      {copiado ? <Check size={12} className="text-app-success" /> : <Copy size={12} />}
      {copiado ? "Copiado" : label}
    </button>
  );
}
