"use client";

import {
  ArrowLeft,
  BarChart3,
  Check,
  CircleAlert,
  CloudAlert,
  ExternalLink,
  LayoutTemplate,
  Loader2,
  Monitor,
  Redo2,
  Smartphone,
  Undo2,
  UploadCloud,
  Workflow,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { lintFunnel } from "@/funnel/logic/lint";
import { cn } from "@/lib/cn";
import { publishFunnelAction } from "@/server/funnels/actions";

import { useDocument, useEditor } from "./editor-context";
import type { LeadUsage, Vista } from "./editor-shell";

export function Topbar({
  funnelId,
  vista,
  onVistaChange,
  leadUsage,
}: {
  funnelId: string;
  vista: Vista;
  onVistaChange: (vista: Vista) => void;
  leadUsage: LeadUsage;
}) {
  const doc = useDocument();
  const saveStatus = useEditor((s) => s.saveStatus);
  const saveError = useEditor((s) => s.saveError);
  const viewport = useEditor((s) => s.viewport);
  const setViewport = useEditor((s) => s.setViewport);
  const undo = useEditor((s) => s.undo);
  const redo = useEditor((s) => s.redo);
  const podeDesfazer = useEditor((s) => s.past.length > 0);
  const podeRefazer = useEditor((s) => s.future.length > 0);

  const errosDeEstrutura = useMemo(
    () => lintFunnel(doc).filter((issue) => issue.severity === "erro"),
    [doc],
  );

  const [publicando, iniciarPublicacao] = useTransition();
  const [erroPublicacao, setErroPublicacao] = useState<string | null>(null);
  const [publicadoAgora, setPublicadoAgora] = useState(false);

  // "Quase no limite" só antes de bater — depois disso o funil já foi
  // despublicado sozinho e o aviso vira o de `autoUnpublishedAt` abaixo.
  const pertoDoLimiteDeLeads =
    leadUsage.limit !== null && leadUsage.count < leadUsage.limit && leadUsage.count >= leadUsage.limit * 0.9;

  function publicar() {
    setErroPublicacao(null);
    iniciarPublicacao(async () => {
      const resultado = await publishFunnelAction(funnelId);
      if (resultado.ok) {
        setPublicadoAgora(true);
        setTimeout(() => setPublicadoAgora(false), 3000);
      } else {
        setErroPublicacao(resultado.error);
      }
    });
  }

  return (
    <>
      {/* Mesmo padrão de faixa full-bleed do banner de assinatura pendente em
          `(app)/layout.tsx` — não o componente `Alert` (pensado pra caixa
          arredondada dentro de conteúdo, não pra topo de tela). */}
      {leadUsage.autoUnpublishedAt ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-app-border bg-app-danger/15 px-4 py-2 text-sm text-app-danger">
          <span>
            Este funil foi despublicado automaticamente por atingir o limite de leads do seu plano.{" "}
            <Link href="/configuracoes/planos" className="font-medium underline underline-offset-2">
              Fazer upgrade
            </Link>{" "}
            para publicar de novo.
          </span>
        </div>
      ) : (
        pertoDoLimiteDeLeads && (
          <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-app-border bg-app-warning/15 px-4 py-2 text-sm text-app-warning">
            <span>
              Este funil já usou {leadUsage.count} de {leadUsage.limit} leads do seu plano — perto do limite. Ao
              estourar, ele é despublicado automaticamente.
            </span>
          </div>
        )
      )}

      <header className="flex shrink-0 flex-wrap items-center gap-2 border-b border-app-border bg-app-surface px-3 py-2">
      <Link
        href="/funis"
        className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-app-muted hover:bg-app-surface-2 hover:text-app-text"
      >
        <ArrowLeft size={15} />
        <span className="hidden sm:inline">Funis</span>
      </Link>

      <span className="hidden max-w-40 truncate text-sm font-medium sm:inline">{doc.name}</span>

      {/* Construtor monta a tela; Fluxo mostra como as telas se ligam. */}
      <div className="flex rounded-lg border border-app-border p-0.5">
        {(
          [
            { chave: "construtor", rotulo: "Construtor", Icone: LayoutTemplate },
            { chave: "fluxo", rotulo: "Fluxo", Icone: Workflow },
          ] as const
        ).map(({ chave, rotulo, Icone }) => (
          <button
            key={chave}
            type="button"
            onClick={() => onVistaChange(chave)}
            // O rótulo some abaixo de `sm`, então sem `aria-label` estes viram
            // dois botões sem nome nenhum no celular — só o ícone, que leitor
            // de tela não lê.
            aria-label={rotulo}
            aria-pressed={vista === chave}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs transition-colors",
              vista === chave
                ? "bg-app-surface-2 text-app-text"
                : "text-app-muted hover:text-app-text",
            )}
          >
            <Icone size={14} />
            <span className="hidden sm:inline">{rotulo}</span>
          </button>
        ))}
      </div>

      <StatusDeSalvamento status={saveStatus} erro={saveError} />

      {/* Problema de estrutura barra a publicação, então precisa aparecer
          enquanto se edita — não só quando a pessoa tenta publicar. */}
      {errosDeEstrutura.length > 0 && (
        <button
          type="button"
          onClick={() => onVistaChange("fluxo")}
          title={errosDeEstrutura.map((e) => e.message).join("\n\n")}
          className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-app-danger transition-colors hover:bg-app-danger/15"
        >
          <CircleAlert size={13} />
          {errosDeEstrutura.length === 1
            ? "1 problema no fluxo"
            : `${errosDeEstrutura.length} problemas no fluxo`}
        </button>
      )}

      <div className="ml-auto flex items-center gap-1">
        <IconeDeAcao label="Desfazer" onClick={undo} disabled={!podeDesfazer}>
          <Undo2 size={15} />
        </IconeDeAcao>
        <IconeDeAcao label="Refazer" onClick={redo} disabled={!podeRefazer}>
          <Redo2 size={15} />
        </IconeDeAcao>

        <div className="mx-1 flex rounded-lg border border-app-border p-0.5">
          <IconeDeAcao
            label="Visualizar como celular"
            onClick={() => setViewport("mobile")}
            ativo={viewport === "mobile"}
          >
            <Smartphone size={14} />
          </IconeDeAcao>
          <IconeDeAcao
            label="Visualizar como desktop"
            onClick={() => setViewport("desktop")}
            ativo={viewport === "desktop"}
          >
            <Monitor size={14} />
          </IconeDeAcao>
        </div>

        <Link
          href={`/funis/${funnelId}/analytics`}
          className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-app-muted hover:bg-app-surface-2 hover:text-app-text"
          title="Ver analytics deste funil"
        >
          <BarChart3 size={15} />
          <span className="hidden md:inline">Analytics</span>
        </Link>

        <a
          href={`/f/${doc.slug}`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-app-muted hover:bg-app-surface-2 hover:text-app-text"
          title="Abrir a versão publicada"
        >
          <ExternalLink size={15} />
          <span className="hidden md:inline">Ver no ar</span>
        </a>

        <Button size="sm" onClick={publicar} disabled={publicando}>
          {publicando ? (
            <Loader2 size={14} className="animate-spin" />
          ) : publicadoAgora ? (
            <Check size={14} />
          ) : (
            <UploadCloud size={14} />
          )}
          {publicadoAgora ? "Publicado" : "Publicar"}
        </Button>
      </div>

      {erroPublicacao && (
        <p role="alert" className="w-full whitespace-pre-line text-xs leading-relaxed text-app-danger">
          {erroPublicacao}
        </p>
      )}
      </header>
    </>
  );
}

/**
 * Em tela estreita não cabe o texto ao lado do ícone, mas o estado do
 * salvamento não pode ficar só implícito num desenho: `role="status"` com
 * `aria-label` mantém a informação disponível para leitores de tela e para
 * quem passa o mouse, sem ocupar largura.
 */
function StatusDeSalvamento({ status, erro }: { status: string; erro: string | null }) {
  const texto =
    status === "erro"
      ? "Não salvo"
      : { salvo: "Salvo", salvando: "Salvando...", pendente: "Alterações pendentes" }[status];

  return (
    <span
      role="status"
      aria-label={texto}
      title={erro ?? texto}
      className={cn(
        "flex items-center gap-1 text-xs",
        status === "erro" ? "text-app-danger" : "text-app-muted",
      )}
    >
      {status === "erro" && <CloudAlert size={13} />}
      {status === "salvando" && <Loader2 size={12} className="animate-spin" />}
      {status === "salvo" && <Check size={12} />}
      <span className="hidden sm:inline">{texto}</span>
    </span>
  );
}

function IconeDeAcao({
  label,
  onClick,
  disabled,
  ativo,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  ativo?: boolean;
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
        "grid h-8 w-8 place-items-center rounded-md transition-colors",
        ativo ? "bg-app-surface-2 text-app-text" : "text-app-muted hover:bg-app-surface-2",
        "disabled:opacity-30 disabled:hover:bg-transparent",
      )}
    >
      {children}
    </button>
  );
}
