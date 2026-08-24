"use client";

import { X } from "lucide-react";
import { useState, useTransition } from "react";

import { Alert } from "@/components/ui/alert";
import { badgeStyles } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { Field, Input, Select } from "@/components/ui/field";
import { ListRow, ListRowActions, ListRowMain } from "@/components/ui/list-row";
import { CodeChip } from "@/components/ui/misc";
import { createWebhookAction, deleteWebhookAction, toggleWebhookAction } from "@/server/webhooks/actions";
import type { WebhookSubscriptionListItem } from "@/server/webhooks/queries";

export function WebhooksManager({
  webhooks: webhooksIniciais,
  funnels,
  canUseWebhooks,
}: {
  webhooks: WebhookSubscriptionListItem[];
  funnels: { id: string; name: string }[];
  /** Feature do plano da organização. */
  canUseWebhooks: boolean;
}) {
  const [webhooks, setWebhooks] = useState(webhooksIniciais);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-app-muted">
        Dispara um <CodeChip>POST</CodeChip> assinado sempre que
        alguém completa um funil — cole a URL de um Zap (&ldquo;Webhooks by Zapier&rdquo;) ou de um cenário do Make
        pra automatizar sem precisar de conector nativo.
      </p>

      {canUseWebhooks ? (
        <NovoWebhookForm funnels={funnels} onCriado={(webhook) => setWebhooks((atual) => [webhook, ...atual])} />
      ) : (
        <Alert tone="warning">Seu plano atual não inclui webhooks — faça upgrade em Configurações para usar.</Alert>
      )}

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
    <Card padding="sm" className="bg-app-surface-2/40">
      <form onSubmit={enviar}>
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
            <Select value={funnelId} onChange={(e) => setFunnelId(e.target.value)} className="w-48">
              <option value="">Todos os funis</option>
              {funnels.map((funnel) => (
                <option key={funnel.id} value={funnel.id}>
                  {funnel.name}
                </option>
              ))}
            </Select>
          </Field>

          <Button type="submit" loading={pending} disabled={!url.trim()}>
            Adicionar
          </Button>
        </div>

        {erro && <p className="mt-2 text-xs text-app-danger">{erro}</p>}

        {segredoNovo && (
          <div className="mt-3 rounded-lg bg-app-surface-2 px-3 py-2 text-xs">
            <p className="text-app-muted">
              Guarde este segredo agora — ele não aparece de novo. Use-o pra conferir a assinatura em
              <CodeChip className="mx-1">X-FunilQuiz-Signature</CodeChip>
              de cada requisição recebida.
            </p>
            <div className="mt-1.5 flex items-center gap-2">
              <CodeChip className="min-w-0 flex-1 truncate">{segredoNovo}</CodeChip>
              <CopyButton value={segredoNovo} />
            </div>
          </div>
          )}
      </form>
    </Card>
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
    <ListRow pending={pending}>
      <ListRowMain title={webhook.url}>
        {webhook.funnelName ?? "Todos os funis"} · segredo {webhook.secretPreview}
      </ListRowMain>

      <ListRowActions>
        {/* Pill que também é o interruptor — por isso é `<button>` com o
            estilo do Badge, e não um Badge com onClick. */}
        <button
          type="button"
          disabled={pending}
          onClick={alternar}
          aria-pressed={webhook.active}
          className={badgeStyles({ tone: webhook.active ? "success" : "neutral", size: "md" })}
        >
          {webhook.active ? "Ativo" : "Pausado"}
        </button>

        <Button
          variant="ghost-danger"
          size="icon-sm"
          aria-label="Remover webhook"
          title="Remover webhook"
          disabled={pending}
          onClick={remover}
        >
          <X size={14} />
        </Button>
      </ListRowActions>
    </ListRow>
  );
}
