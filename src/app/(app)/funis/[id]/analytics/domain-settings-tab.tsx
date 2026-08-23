"use client";

import { Check, Loader2, X } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import { addFunnelDomainAction, removeFunnelDomainAction, verifyFunnelDomainAction } from "@/server/domains/actions";
import type { FunnelDomainListItem } from "@/server/domains/queries";

export function DomainSettingsTab({
  funnelId,
  domains: domainsIniciais,
  appHostname,
}: {
  funnelId: string;
  domains: FunnelDomainListItem[];
  appHostname: string;
}) {
  const [domains, setDomains] = useState(domainsIniciais);

  return (
    <div className="max-w-lg rounded-2xl border border-app-border bg-app-surface p-4">
      <h2 className="text-sm font-medium text-app-text">Domínio personalizado</h2>
      <p className="mt-1 text-xs text-app-muted">
        Sirva este funil no seu próprio domínio, em vez de{" "}
        <code className="rounded bg-app-surface-2 px-1 py-0.5">{appHostname}/f/...</code>. Precisa provar que o
        domínio é seu antes de qualquer coisa ir ao ar nele.
      </p>

      <div className="mt-4 flex flex-col gap-3">
        {domains.map((domain) => (
          <DomainRow
            key={domain.id}
            funnelId={funnelId}
            domain={domain}
            appHostname={appHostname}
            onVerificado={() =>
              setDomains((atual) => atual.map((d) => (d.id === domain.id ? { ...d, verifiedAt: new Date() } : d)))
            }
            onRemovido={() => setDomains((atual) => atual.filter((d) => d.id !== domain.id))}
          />
        ))}
      </div>

      <NovoDominioForm
        funnelId={funnelId}
        onAdicionado={(domain) => setDomains((atual) => [...atual, domain])}
      />
    </div>
  );
}

function NovoDominioForm({
  funnelId,
  onAdicionado,
}: {
  funnelId: string;
  onAdicionado: (domain: FunnelDomainListItem) => void;
}) {
  const [hostname, setHostname] = useState("");
  const [pending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    startTransition(async () => {
      const result = await addFunnelDomainAction(funnelId, hostname);
      if (!result.ok) {
        setErro(result.error);
        return;
      }

      setHostname("");
      onAdicionado({ ...result.domain, verifiedAt: null });
    });
  }

  return (
    <form onSubmit={enviar} className="mt-4 flex items-end gap-2 border-t border-app-border pt-4">
      <div className="flex-1">
        <Field label="Novo domínio" hint="Sem https:// nem barra — ex.: quiz.suamarca.com.br">
          <Input value={hostname} onChange={(e) => setHostname(e.target.value)} placeholder="quiz.suamarca.com.br" />
        </Field>
      </div>
      <Button type="submit" size="sm" disabled={pending || !hostname.trim()}>
        {pending ? <Loader2 size={14} className="animate-spin" /> : "Adicionar"}
      </Button>
      {erro && <p className="text-xs text-app-danger">{erro}</p>}
    </form>
  );
}

function DomainRow({
  funnelId,
  domain,
  appHostname,
  onVerificado,
  onRemovido,
}: {
  funnelId: string;
  domain: FunnelDomainListItem;
  appHostname: string;
  onVerificado: () => void;
  onRemovido: () => void;
}) {
  const [verificando, startVerificando] = useTransition();
  const [removendo, startRemovendo] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  const verificado = domain.verifiedAt !== null;

  function verificar() {
    setErro(null);
    startVerificando(async () => {
      const result = await verifyFunnelDomainAction(domain.id, funnelId);
      if (result.ok) onVerificado();
      else setErro(result.error);
    });
  }

  function remover() {
    startRemovendo(async () => {
      const result = await removeFunnelDomainAction(domain.id, funnelId);
      if (result.ok) onRemovido();
    });
  }

  return (
    <div className={cn("rounded-lg border border-app-border p-3", (verificando || removendo) && "opacity-60")}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-sm text-app-text">{domain.hostname}</span>
          {verificado ? (
            <span className="flex items-center gap-1 rounded-full bg-app-success/15 px-2 py-0.5 text-xs text-app-success">
              <Check size={11} /> Verificado
            </span>
          ) : (
            <span className="rounded-full bg-app-surface-2 px-2 py-0.5 text-xs text-app-muted">Pendente</span>
          )}
        </div>

        <button
          type="button"
          title="Remover domínio"
          onClick={remover}
          disabled={removendo}
          className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-app-muted hover:bg-app-danger/10 hover:text-app-danger"
        >
          <X size={13} />
        </button>
      </div>

      {!verificado && (
        <div className="mt-2 rounded-lg bg-app-surface-2 p-2.5 text-xs">
          <p className="text-app-muted">
            1. Crie um registro <strong className="text-app-text">TXT</strong> em{" "}
            <code className="rounded bg-app-surface px-1 py-0.5">_funis-challenge.{domain.hostname}</code> com o
            valor:
          </p>
          <code className="mt-1 block truncate rounded bg-app-surface px-2 py-1 text-app-text">
            {domain.verificationToken}
          </code>
          <p className="mt-2 text-app-muted">
            2. Aponte um registro <strong className="text-app-text">CNAME</strong> de {domain.hostname} para{" "}
            <code className="rounded bg-app-surface px-1 py-0.5">{appHostname}</code>. HTTPS depende do proxy
            usado no seu servidor — este passo só confirma a posse do domínio.
          </p>
          <Button size="sm" variant="outline" className="mt-2" onClick={verificar} disabled={verificando}>
            {verificando ? <Loader2 size={12} className="animate-spin" /> : "Verificar agora"}
          </Button>
          {erro && <p className="mt-1.5 text-app-danger">{erro}</p>}
        </div>
      )}
    </div>
  );
}
