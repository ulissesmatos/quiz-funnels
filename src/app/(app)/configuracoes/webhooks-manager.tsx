"use client";

import { Check, Copy, Loader2, X } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import { createWebhookAction, deleteWebhookAction, toggleWebhookAction } from "@/server/webhooks/actions";
import type { WebhookSubscriptionListItem } from "@/server/webhooks/queries";

export function WebhooksManager({
  webhooks: webhooksIniciais,
  funnels,
}: {
  webhooks: WebhookSubscriptionListItem[];
  funnels: { id: string; name: string }[];
}) {
  const [webhooks, setWebhooks] = useState(webhooksIniciais);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-app-muted">
        Dispara um <code className="rounded bg-app-surface-2 px-1 py-0.5 text-xs">POST</code> assinado sempre que
        alguém completa um funil — cole a URL de um Zap (&ldquo;Webhooks by Zapier&rdquo;) ou de um cenário do Make
        pra automatizar sem precisar de conector nativo.
      </p>

      <NovoWebhookForm funnels={funnels} onCriado={(webhook) => setWebhooks((atual) => [webhook, ...atual])} />

      {webhooks.length > 0 && (
        <ul className="flex flex-col gap-2">
          {webhooks.map((webhook) => (
            <WebhookRow
              key={webhook.id}
              webhook={webhook}
              onRemovido={() => setWebhooks((atual) => atual.filter((w) => w.id !== webhook.id))}
              onAlternado={(active) =>
                setWebhooks((atual) => atual.map((w) => (w.id === webhook.id ? { ...w, active } : w)))
              }
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function NovoWebhookForm({
  funnels,
  onCriado,
}: {
  funnels: { id: string; name: string }[];
  onCriado: (webhook: WebhookSubscriptionListItem) => void;
}) {
  const [url, setUrl] = useState("");
  const [funnelId, setFunnelId] = useState("");
  const [pending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [segredoNovo, setSegredoNovo] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setSegredoNovo(null);

    startTransition(async () => {
      const result = await createWebhookAction(url, funnelId || null);
      if (!result.ok) {
        setErro(result.error);
        return;
      }

      setSegredoNovo(result.secret);
      setUrl("");
      onCriado({
        id: crypto.randomUUID(),
        url,
        funnelId: funnelId || null,
        funnelName: funnels.find((f) => f.id === funnelId)?.name ?? null,
        active: true,
        createdAt: new Date(),
        secretPreview: `••••${result.secret.slice(-4)}`,
      });
    });
  }

  return (
    <form onSubmit={enviar} className="rounded-2xl border border-app-border bg-app-surface p-4">
      <h3 className="text-sm font-medium">Novo webhook</h3>

      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Field label="URL de destino">
            <Input
              type="url"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://hooks.zapier.com/hooks/catch/..."
            />
          </Field>
        </div>

        <Field label="Funil">
          <select
            value={funnelId}
            onChange={(e) => setFunnelId(e.target.value)}
            className="h-10 rounded-lg border border-app-border bg-app-surface px-3 text-sm text-app-text focus:border-app-primary focus:outline-none"
          >
            <option value="">Todos os funis</option>
            {funnels.map((funnel) => (
              <option key={funnel.id} value={funnel.id}>
                {funnel.name}
              </option>
            ))}
          </select>
        </Field>

        <Button type="submit" disabled={pending || !url.trim()}>
          {pending ? <Loader2 size={14} className="animate-spin" /> : "Adicionar"}
        </Button>
      </div>

      {erro && <p className="mt-2 text-xs text-app-danger">{erro}</p>}

      {segredoNovo && (
        <div className="mt-3 rounded-lg bg-app-surface-2 px-3 py-2 text-xs">
          <p className="text-app-muted">
            Guarde este segredo agora — ele não aparece de novo. Use-o pra conferir a assinatura em
            <code className="mx-1 rounded bg-app-surface px-1 py-0.5">X-FunilQuiz-Signature</code>
            de cada requisição recebida.
          </p>
          <div className="mt-1.5 flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded bg-app-surface px-2 py-1 text-app-text">
              {segredoNovo}
            </code>
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard.writeText(segredoNovo);
                setCopiado(true);
                setTimeout(() => setCopiado(false), 2000);
              }}
              className="flex shrink-0 items-center gap-1 rounded-md border border-app-border px-2 py-1 hover:border-app-primary/60"
            >
              {copiado ? <Check size={12} /> : <Copy size={12} />}
              {copiado ? "Copiado" : "Copiar"}
            </button>
          </div>
        </div>
      )}
    </form>
  );
}

function WebhookRow({
  webhook,
  onRemovido,
  onAlternado,
}: {
  webhook: WebhookSubscriptionListItem;
  onRemovido: () => void;
  onAlternado: (active: boolean) => void;
}) {
  const [pending, startTransition] = useTransition();

  function alternar() {
    const novoEstado = !webhook.active;
    startTransition(async () => {
      const result = await toggleWebhookAction(webhook.id, novoEstado);
      if (result.ok) onAlternado(novoEstado);
    });
  }

  function remover() {
    startTransition(async () => {
      const result = await deleteWebhookAction(webhook.id);
      if (result.ok) onRemovido();
    });
  }

  return (
    <li
      className={cn(
        "flex items-center justify-between gap-3 rounded-lg border border-app-border bg-app-surface px-3 py-2.5",
        pending && "opacity-60",
      )}
    >
      <div className="min-w-0">
        <p className="truncate text-sm text-app-text">{webhook.url}</p>
        <p className="text-xs text-app-muted">
          {webhook.funnelName ?? "Todos os funis"} · segredo {webhook.secretPreview}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={alternar}
          className={cn(
            "rounded-full px-2.5 py-1 text-xs",
            webhook.active ? "bg-app-success/15 text-app-success" : "bg-app-surface-2 text-app-muted",
          )}
        >
          {webhook.active ? "Ativo" : "Pausado"}
        </button>

        <button
          type="button"
          title="Remover webhook"
          disabled={pending}
          onClick={remover}
          className="grid h-8 w-8 place-items-center rounded-md text-app-muted hover:bg-app-danger/10 hover:text-app-danger"
        >
          <X size={14} />
        </button>
      </div>
    </li>
  );
}
