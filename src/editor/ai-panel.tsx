"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithToolCalls } from "ai";
import { AlertCircle, ArrowUp, Brain, Loader2, Sparkles, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { aplicarChamadaDaIa } from "@/funnel/ai/apply";
import type { AiToolName } from "@/funnel/ai/tools";
import { cn } from "@/lib/cn";
import { saveFunnelDocumentAction } from "@/server/funnels/actions";

import type { AiPrefill } from "./ai-kickoff";
import { ChatMarkdown } from "./chat-markdown";
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
export function AiPanel({
  prefill,
  onPrefillConsumed,
}: {
  prefill?: AiPrefill | null;
  onPrefillConsumed?: () => void;
}) {
  const store = useEditorStore();
  const funnelId = useEditor((s) => s.funnelId);
  const [erroLocal, setErroLocal] = useState<string | null>(null);
  const [texto, setTexto] = useState("");
  // Modo cuidadoso: persiste entre mensagens (não é um flag de disparo único)
  // até a pessoa desligar de propósito.
  const [capricho, setCapricho] = useState(false);

  /** Chamadas já aplicadas, por `toolCallId`. */
  const aplicadas = useRef(new Set<string>());
  const fimDaLista = useRef<HTMLDivElement>(null);
  /** Texto do último auto-envio disparado, pra não duplicar em StrictMode. */
  const autoEnviado = useRef<string | null>(null);
  /**
   * Trava síncrona contra duplo envio.
   *
   * `ocupado` (abaixo) só vira `true` depois que `sendMessage` é chamado — e
   * antes disso há um `await saveFunnelDocumentAction(...)`. Nessa janela,
   * `ocupado` ainda está `false` e um segundo Enter/clique passaria pela
   * guarda. Esta ref é setada no exato instante do clique, antes de qualquer
   * `await`, e por isso fecha a janela que `ocupado` sozinho não cobre.
   */
  const enviando = useRef(false);

  const { messages, sendMessage, status, error, stop, addToolResult } = useChat({
    transport: new DefaultChatTransport({ api: "/api/ai/chat", body: { funnelId } }),
    // Sem isto, responder o popup do `ask_user` via `addToolResult` nunca
    // reenvia pro servidor — o resultado fica só no estado local do cliente e
    // o stream permanece parado esperando uma mensagem que nunca chega.
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
  });

  const ocupado = status === "submitted" || status === "streaming";

  // Pergunta da IA ainda sem resposta: o stream está parado esperando.
  const perguntaPendente = encontrarPerguntaPendente(messages);

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

  async function enviar(textoForcado?: string) {
    if (enviando.current) return;
    const conteudo = (textoForcado ?? texto).trim();
    if (!conteudo || ocupado) return;

    enviando.current = true;
    setErroLocal(null);
    setTexto("");

    // O servidor monta o contexto lendo o rascunho do banco. Salvar antes evita
    // que ele trabalhe sobre uma versão anterior à que está na tela.
    const salvo = await saveFunnelDocumentAction(funnelId, store.getState().doc);
    if (!salvo.ok) {
      setErroLocal(salvo.error);
      enviando.current = false; // sendMessage nunca chegou a rodar
      return;
    }
    store.getState().setSaveStatus("salvo");

    sendMessage({ text: conteudo }, { body: { thorough: capricho } });
    // Não libera aqui: o pedido segue em voo. O efeito abaixo libera quando
    // `ocupado` volta a `false` de verdade.
  }

  // Libera a trava de envio quando o chat volta a ficar ocioso — cobre tanto
  // o fim normal da resposta quanto erro/parada no meio do stream.
  useEffect(() => {
    if (!ocupado) enviando.current = false;
  }, [ocupado]);

  // Pedido feito no modal de criação do funil: preenche e já dispara sozinho,
  // sem esperar clique — chega aqui via `sessionStorage` (ver `ai-kickoff.ts`).
  useEffect(() => {
    if (!prefill) return;
    if (autoEnviado.current === prefill.texto) return; // já disparado (StrictMode)

    autoEnviado.current = prefill.texto;
    onPrefillConsumed?.();
    void enviar(prefill.texto);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefill]);

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

      <div className="relative shrink-0 border-t border-app-border p-2.5">
        <div className="mb-1.5 flex items-center px-0.5">
          <button
            type="button"
            onClick={() => setCapricho((atual) => !atual)}
            aria-pressed={capricho}
            title="Modo cuidadoso: planeja tudo antes de construir e pensa mais — demora mais, erra menos"
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors",
              capricho
                ? "border-app-primary bg-app-primary/15 text-app-primary"
                : "border-app-border text-app-muted hover:text-app-text",
            )}
          >
            <Brain size={12} />
            Capricho
          </button>
        </div>

        {perguntaPendente && (
          <PopupDePergunta
            pergunta={perguntaPendente.input}
            onResponder={(resposta) =>
              void addToolResult({
                tool: "ask_user",
                toolCallId: perguntaPendente.toolCallId,
                output: resposta,
              })
            }
          />
        )}

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

type PerguntaDaIa = {
  toolCallId: string;
  input: { question: string; options: string[]; allowFreeText?: boolean };
};

/**
 * Pergunta feita pela IA e ainda sem resposta.
 *
 * `ask_user` não tem `execute` no servidor, então o stream para nela e a
 * chamada fica em "input-available" até o cliente responder. É esse estado que
 * procuramos aqui.
 */
function encontrarPerguntaPendente(messages: readonly unknown[]): PerguntaDaIa | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i] as { role: string; parts: { type: string }[] };
    if (message.role !== "assistant") continue;

    for (const part of message.parts) {
      if (part.type !== "tool-ask_user") continue;

      const chamada = part as unknown as {
        toolCallId: string;
        state: string;
        input?: PerguntaDaIa["input"];
      };

      if (chamada.state === "input-available" && chamada.input?.options) {
        return { toolCallId: chamada.toolCallId, input: chamada.input };
      }
    }
  }

  return null;
}

/**
 * Popup sobre o campo do chat.
 *
 * Fica acima do input, e não no meio da conversa, porque é ali que a pessoa
 * está olhando quando espera responder — e porque o stream está parado até ela
 * responder, então a pergunta não pode passar despercebida.
 */
function PopupDePergunta({
  pergunta,
  onResponder,
}: {
  pergunta: PerguntaDaIa["input"];
  onResponder: (resposta: string) => void;
}) {
  const [texto, setTexto] = useState("");
  const permiteTexto = pergunta.allowFreeText !== false;

  return (
    <div className="absolute right-2.5 bottom-full left-2.5 z-10 mb-2 rounded-xl border border-app-primary/60 bg-app-surface p-3 shadow-[0_12px_40px_rgba(0,0,0,0.45)]">
      <div className="mb-2.5 text-sm leading-snug">
        <ChatMarkdown text={pergunta.question} />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {pergunta.options.map((opcao) => (
          <button
            key={opcao}
            type="button"
            onClick={() => onResponder(opcao)}
            className="rounded-full border border-app-border bg-app-surface-2 px-3 py-1.5 text-xs transition-colors hover:border-app-primary hover:text-app-text"
          >
            {opcao}
          </button>
        ))}
      </div>

      {permiteTexto && (
        <div className="mt-2 flex gap-1.5">
          <input
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && texto.trim()) onResponder(texto.trim());
            }}
            placeholder="ou escreva sua resposta"
            aria-label="Resposta para o copiloto"
            className="h-8 flex-1 rounded-lg border border-app-border bg-app-surface-2 px-2.5 text-xs outline-none placeholder:text-app-muted focus:border-app-primary"
          />
          <button
            type="button"
            disabled={!texto.trim()}
            onClick={() => onResponder(texto.trim())}
            className="rounded-lg bg-app-primary px-3 text-xs text-white disabled:opacity-30"
          >
            Enviar
          </button>
        </div>
      )}

      {/* Sem esta saída, ignorar a pergunta deixaria o stream parado para sempre. */}
      <button
        type="button"
        onClick={() => onResponder("Siga com o que você achar melhor.")}
        className="mt-2 text-xs text-app-muted underline underline-offset-2 hover:text-app-text"
      >
        Decida por mim
      </button>
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
          return <ChatMarkdown key={index} text={texto} />;
        }

        if (part.type.startsWith("tool-")) {
          const chamada = part as unknown as {
            state: string;
            output?: { ok?: boolean; resumo?: string; erro?: string };
          };

          const falhou = chamada.output?.ok === false;

          // O erro técnico (validação de schema, id que não existe) volta
          // pro modelo corrigir na próxima chamada — não serve pra quem está
          // lendo o chat. Aqui mostramos só que algo foi ajustado.
          const rotulo =
            chamada.output?.resumo ??
            (falhou ? "Ajustando um detalhe" : RÓTULOS_DE_FERRAMENTA[part.type.slice("tool-".length)] ?? "Editando");
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
  add_blocks: "Adicionando blocos",
  update_block: "Editando bloco",
  remove_block: "Removendo bloco",
  move_block: "Movendo bloco",
  set_step_logic: "Definindo lógica",
  branch_by_answer: "Ramificando por resposta",
  check_funnel: "Conferindo o funil",
  ask_user: "Aguardando sua resposta",
  set_theme: "Ajustando o tema",
  submit_plan: "Planejando o funil",
  set_variables: "Definindo variáveis",
};
