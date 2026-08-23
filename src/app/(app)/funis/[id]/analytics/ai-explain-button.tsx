"use client";

import { Loader2, Sparkles } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { ChatMarkdown } from "@/editor/chat-markdown";
import { explainAnalyticsAction, type AnalyticsSection } from "@/server/analytics/ai-explain";

/**
 * Só é renderizado pelo componente pai quando há amostra suficiente — nunca
 * "desabilitado". Ausente do JSX é o que garante, de fato, que nenhuma
 * chamada de IA acontece sem dado, não uma checagem em tempo de clique.
 */
export function AiExplainButton({
  funnelId,
  section,
  metrics,
  sampleSize,
}: {
  funnelId: string;
  section: AnalyticsSection;
  metrics: Record<string, unknown>;
  sampleSize: number;
}) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ text?: string; error?: string } | null>(null);

  function explicar() {
    setResult(null);
    startTransition(async () => {
      const resposta = await explainAnalyticsAction(funnelId, section, metrics, sampleSize);
      setResult(resposta.ok ? { text: resposta.text } : { error: resposta.error });
    });
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <Button variant="outline" size="sm" onClick={explicar} disabled={pending}>
        {pending ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
        Explicar com IA
      </Button>

      {result?.text && (
        <div className="w-full rounded-lg border border-app-border bg-app-surface-2 p-3">
          <ChatMarkdown text={result.text} />
        </div>
      )}

      {result?.error && <p className="text-xs text-app-danger">{result.error}</p>}
    </div>
  );
}
