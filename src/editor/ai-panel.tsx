"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { AlertCircle, ArrowUp, Loader2, Sparkles, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { aplicarChamadaDaIa } from "@/funnel/ai/apply";
import type { AiToolName } from "@/funnel/ai/tools";
import { cn } from "@/lib/cn";
import { saveFunnelDocumentAction } from "@/server/funnels/actions";

import { useEditor, useEditorStore } from "./editor-context";

const SUGESTOES = [
  "Crie um quiz de 6 perguntas sobre qualidade do sono, com plano personalizado no fim",
  "Adicione uma tela de prova social depois da terceira pergunta",
  "Deixe o funil com cara de marca fitness: verde-limão sobre fundo escuro",
];

/**
 * Painel do copiloto.
 *
 * As operações são aplicadas no canvas assim que cada chamada de ferramenta
 * fecha — não no fim da resposta. Como o modelo trabalha uma tela por vez, o
 * funil vai se montando na frente de quem pediu, em vez de aparecer pronto
 * depois de meio minuto de espera.
 */
export function AiPanel() {
  const store = useEditorStore();
  const funnelId = useEditor((s) => s.funnelId);
  const [erroLocal, setErroLocal] = useState<string | null>(null);
  const [texto, setTexto] = useState("");

  /** Chamadas já aplicadas, por `toolCallId`. */
  const aplicadas = useRef(new Set<string>());
  const fimDaLista = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status, error, stop } = useChat({
    transport: new DefaultChatTransport({ api: "/api/ai/chat", body: { funnelId } }),
  });

  const ocupado = status === "submitted" || status === "streaming";

  // Aplica no documento cada chamada de ferramenta que chegou completa.
  useEffect(() => {
    const estado = store.getState();
    const tocados: string[] = [];

    for (const message of messages as { id: string; role: string; parts: { type: string }[] }[]) {
      if (message.role !== "assistant") continue;

      for (const part of message.parts) {
        if (!part.type.startsWith("tool-")) continue;

        const chamada = part as unknown as {
          toolCallId: string;
          state: string;
          input?: Record<string, unknown>;
        };

        // "input-streaming" ainda está recebendo argumentos pela metade.
        if (chamada.state === "input-streaming" || !chamada.input) continue;
        // O provider pode reemitir a mesma chamada; aplicar duas vezes
        // duplicaria blocos no canvas.
        if (aplicadas.current.has(chamada.toolCallId)) continue;

        aplicadas.current.add(chamada.toolCallId);

        const nome = part.type.slice("tool-".length) as AiToolName;
        const resultado = aplicarChamadaDaIa(store.getState().doc, nome, chamada.input);

        if (!resultado.ok) continue;

        // Toda a resposta da IA vira um único passo de undo, mesmo levando
        // dezenas de operações e meio minuto para terminar.
        store.getState().replaceDocument(resultado.doc, {
          label: "Edição do copiloto",
          mergeKey: `ai:${message.id}`,
          mergeWindowMs: Infinity,
        });
        tocados.push(...resultado.blocosTocados);
      }
    }

    if (tocados.length > 0) {
      estado.highlightBlocks(tocados);
      const ultimo = tocados[tocados.length - 1];
      // Segue a IA: o bloco recém-criado pode estar fora da área visível.
      requestAnimationFrame(() => {
        document
          .querySelector(`[data-block-id="${ultimo}"]`)
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    }
  }, [messages, store]);

  useEffect(() => {
    fimDaLista.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function enviar() {
    const conteudo = texto.trim();
    if (!conteudo || ocupado) return;

    setErroLocal(null);
    setTexto("");

    // O servidor monta o contexto lendo o rascunho do banco. Salvar antes evita
    // que ele trabalhe sobre uma versão anterior à que está na tela.
    const salvo = await saveFunnelDocumentAction(funnelId, store.getState().doc);
    if (!salvo.ok) {
      setErroLocal(salvo.error);
      return;
    }
    store.getState().setSaveStatus("salvo");

    sendMessage({ text: conteudo });
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex shrink-0 items-center gap-2 border-b border-app-border px-3 py-2.5">
        <Sparkles size={15} className="text-app-primary" />
        <h2 className="text-sm font-medium">Copiloto</h2>
        {ocupado && <Loader2 size={13} className="ml-auto animate-spin text-app-muted" />}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {messages.length === 0 ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-app-muted">
              Descreva o funil que você quer. As mudanças aparecem no canvas enquanto ele monta.
            </p>
            {SUGESTOES.map((sugestao) => (
              <button
                key={sugestao}
                type="button"
                onClick={() => setTexto(sugestao)}
                className="rounded-lg border border-app-border px-3 py-2 text-left text-xs leading-snug text-app-muted transition-colors hover:border-app-primary/60 hover:text-app-text"
              >
                {sugestao}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {messages.map((message) => (
              <Mensagem key={message.id} message={message} />
            ))}
          </div>
        )}

        {(error || erroLocal) && (
          <p
            role="alert"
            className="mt-3 flex items-start gap-1.5 rounded-lg bg-app-danger/10 px-2.5 py-2 text-xs text-app-danger"
          >
            <AlertCircle size={13} className="mt-px shrink-0" />
            {erroLocal ?? error?.message}
          </p>
        )}

        <div ref={fimDaLista} />
      </div>

      <div className="shrink-0 border-t border-app-border p-2.5">
        <div className="flex items-end gap-1.5 rounded-xl border border-app-border bg-app-surface-2 p-1.5">
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void enviar();
              }
            }}
            rows={2}
            placeholder="O que você quer construir?"
            aria-label="Mensagem para o copiloto"
            className="max-h-40 min-h-10 flex-1 resize-none bg-transparent px-1.5 py-1 text-sm outline-none placeholder:text-app-muted"
          />

          <button
            type="button"
            aria-label={ocupado ? "Parar" : "Enviar"}
            onClick={() => (ocupado ? stop() : void enviar())}
            disabled={!ocupado && !texto.trim()}
            className={cn(
              "grid h-8 w-8 shrink-0 place-items-center rounded-lg transition-colors",
              "bg-app-primary text-white hover:bg-app-primary-hover disabled:opacity-30",
            )}
          >
            {ocupado ? <Square size={13} /> : <ArrowUp size={15} />}
          </button>
        </div>
      </div>
    </div>
  );
}

function Mensagem({ message }: { message: { role: string; parts: { type: string }[] } }) {
  if (message.role === "user") {
    const texto = message.parts
      .map((part) => (part.type === "text" ? (part as unknown as { text: string }).text : ""))
      .join("");

    return (
      <p className="ml-6 rounded-xl rounded-br-sm bg-app-primary/15 px-3 py-2 text-sm">{texto}</p>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      {message.parts.map((part, index) => {
        if (part.type === "text") {
          const texto = (part as unknown as { text: string }).text;
          if (!texto.trim()) return null;
          return (
            <p key={index} className="text-sm leading-relaxed whitespace-pre-wrap">
              {texto}
            </p>
          );
        }

        if (part.type.startsWith("tool-")) {
          const chamada = part as unknown as {
            state: string;
            output?: { ok?: boolean; resumo?: string; erro?: string };
          };

          const rotulo =
            chamada.output?.resumo ??
            chamada.output?.erro ??
            RÓTULOS_DE_FERRAMENTA[part.type.slice("tool-".length)] ??
            "Editando";

          const falhou = chamada.output?.ok === false;
          const rodando = chamada.state === "input-streaming" || chamada.state === "input-available";

          return (
            <p
              key={index}
              className={cn(
                "flex items-center gap-1.5 text-xs",
                falhou ? "text-app-danger" : "text-app-muted",
              )}
            >
              {rodando ? (
                <Loader2 size={11} className="animate-spin" />
              ) : (
                <span className={cn("h-1.5 w-1.5 rounded-full", falhou ? "bg-app-danger" : "bg-app-success")} />
              )}
              {rotulo}
            </p>
          );
        }

        return null;
      })}
    </div>
  );
}

const RÓTULOS_DE_FERRAMENTA: Record<string, string> = {
  add_step: "Criando tela",
  update_step: "Ajustando tela",
  remove_step: "Removendo tela",
  add_block: "Adicionando bloco",
  update_block: "Editando bloco",
  remove_block: "Removendo bloco",
  move_block: "Movendo bloco",
  set_step_logic: "Definindo lógica",
  set_theme: "Ajustando o tema",
};
