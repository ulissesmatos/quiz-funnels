"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithToolCalls } from "ai";
import {
  ArrowUp,
  ArrowUpDown,
  Blocks,
  Brain,
  CheckCheck,
  ChevronRight,
  ClipboardList,
  FilePlus2,
  GitBranch,
  MessageCircleQuestionMark,
  Palette,
  PencilLine,
  RotateCcw,
  Sparkles,
  Split,
  Square,
  Trash2,
  Variable,
  Wrench,
} from "lucide-react";
import type { ComponentType } from "react";
import { useEffect, useRef, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { ShimmerText } from "@/components/ui/shimmer-text";
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
  const [reconectando, setReconectando] = useState(false);

  /** Chamadas já aplicadas, por `toolCallId`. */
  const aplicadas = useRef(new Set<string>());
  const fimDaLista = useRef<HTMLDivElement>(null);
  const listaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  /**
   * Gruda no fim da lista enquanto a pessoa não rolar pra cima de propósito.
   * `ref`, não estado: mudar a cada frame de scroll não deve re-renderizar.
   */
  const coladoNoFim = useRef(true);
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

  const { messages, sendMessage, status, error, stop, addToolResult, regenerate, clearError } = useChat({
    transport: new DefaultChatTransport({ api: "/api/ai/chat", body: { funnelId } }),
    // Sem isto, responder o popup do `ask_user` via `addToolResult` nunca
    // reenvia pro servidor — o resultado fica só no estado local do cliente e
    // o stream permanece parado esperando uma mensagem que nunca chega.
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
  });

  const ocupado = status === "submitted" || status === "streaming";

  // Pergunta da IA ainda sem resposta: o stream está parado esperando.
  const perguntaPendente = encontrarPerguntaPendente(messages);

  /**
   * Janela entre o envio e o primeiro pedaço de resposta — no modo cuidadoso
   * chega a dezenas de segundos, porque o modelo planeja antes de escrever.
   * Sem um sinal aqui a tela fica parada e parece travada.
   */
  const ultima = messages[messages.length - 1];
  const aguardandoResposta =
    ocupado && (!ultima || ultima.role !== "assistant" || !temConteudoVisivel(ultima));

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

  // Só rola sozinho até o fim se a pessoa já estava lá — senão, rolar pra
  // cima pra reler algo é impossível durante o streaming, porque cada token
  // novo dispara este efeito e puxa a tela de volta pro fim.
  useEffect(() => {
    if (coladoNoFim.current) fimDaLista.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function aoRolarLista() {
    const el = listaRef.current;
    if (!el) return;
    const distanciaDoFim = el.scrollHeight - el.scrollTop - el.clientHeight;
    coladoNoFim.current = distanciaDoFim < 96;
  }

  // Textarea que cresce com o conteúdo até um teto, depois passa a rolar por
  // dentro — sem isto, um prompt de várias linhas ficava cortado dentro de
  // uma caixa de altura fixa.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [texto]);

  /**
   * Detecta quando o copiloto trava no meio de uma resposta (conexão caiu, o
   * provider parou de mandar tokens) e tenta de novo sozinho antes de incomodar
   * quem está usando. `messages` muda a cada pedaço novo do stream — se ficar
   * `TIMEOUT_SEM_ATIVIDADE_MS` sem nenhuma mudança enquanto `ocupado` for
   * verdadeiro, não veio nada nesse intervalo: trata como travado.
   *
   * `reconectando` só é zerado no próximo `enviar()` (não aqui dentro, pra não
   * chamar `setState` direto no corpo do efeito) — como o rótulo some da tela
   * assim que `ocupado` volta a `false`, deixar o valor antigo parado até lá
   * não é visível.
   */
  const tentativas = useRef(0);
  useEffect(() => {
    if (!ocupado) {
      tentativas.current = 0;
      return;
    }

    const TIMEOUT_SEM_ATIVIDADE_MS = 25_000;
    const MAX_TENTATIVAS = 2;

    const temporizador = setTimeout(() => {
      if (tentativas.current < MAX_TENTATIVAS) {
        tentativas.current += 1;
        setReconectando(true);
        stop();
        void regenerate();
      } else {
        stop();
        setErroLocal("O copiloto parou de responder depois de algumas tentativas. Tente de novo.");
      }
    }, TIMEOUT_SEM_ATIVIDADE_MS);

    return () => clearTimeout(temporizador);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, ocupado]);

  async function enviar(textoForcado?: string) {
    if (enviando.current) return;
    const conteudo = (textoForcado ?? texto).trim();
    if (!conteudo || ocupado) return;

    enviando.current = true;
    setErroLocal(null);
    setReconectando(false);
    clearError();
    setTexto("");
    coladoNoFim.current = true;
    tentativas.current = 0;

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
        <span className="grid h-6 w-6 place-items-center rounded-md bg-app-accent/15 text-app-accent">
          <Sparkles size={13} />
        </span>
        <h2 className="text-sm font-medium">Copiloto</h2>
        {capricho && (
          <span className="ml-auto flex items-center gap-1 rounded-full bg-app-accent/15 px-2 py-0.5 text-[10px] font-medium text-app-accent">
            <Brain size={10} />
            Capricho
          </span>
        )}
      </header>

      <div ref={listaRef} onScroll={aoRolarLista} className="min-h-0 flex-1 overflow-y-auto p-3">
        {messages.length === 0 ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm leading-relaxed text-app-muted">
              Descreva o funil que você quer. As mudanças aparecem no canvas enquanto ele monta.
            </p>
            <div className="flex flex-col gap-1.5">
              {SUGESTOES.map((sugestao) => (
                <button
                  key={sugestao}
                  type="button"
                  // Envia direto: antes só preenchia o campo, e era preciso um
                  // segundo clique no botão de enviar pra nada acontecer no meio.
                  onClick={() => void enviar(sugestao)}
                  className="group flex items-start gap-2 rounded-lg border border-app-border px-3 py-2.5 text-left text-xs leading-snug text-app-muted transition-colors duration-150 ease-app hover:border-app-accent/60 hover:bg-app-surface-2 hover:text-app-text"
                >
                  <Sparkles size={12} className="mt-0.5 shrink-0 text-app-accent/80" />
                  <span className="flex-1">{sugestao}</span>
                  <ChevronRight
                    size={13}
                    className="mt-0.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                  />
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {messages.map((message) => (
              <Mensagem key={message.id} message={message} />
            ))}
          </div>
        )}

        {aguardandoResposta && (
          <div className="mt-3 flex items-center gap-2 text-sm">
            <Sparkles size={13} className="shrink-0 animate-pulse text-app-accent" />
            <ShimmerText>
              {reconectando ? "Reconectando…" : capricho ? "Planejando com calma…" : "Pensando…"}
            </ShimmerText>
          </div>
        )}

        {(error || erroLocal) && (
          <Alert tone="danger" className="mt-3 text-xs">
            <p>{erroLocal ?? error?.message}</p>
            {error && !erroLocal && (
              <button
                type="button"
                onClick={() => void regenerate()}
                className="mt-1.5 flex items-center gap-1 font-medium underline underline-offset-2"
              >
                <RotateCcw size={11} />
                Tentar de novo
              </button>
            )}
          </Alert>
        )}

        <div ref={fimDaLista} />
      </div>

      {/* `relative` ancora o popup de pergunta, que abre por cima do campo. */}
      <div className="relative shrink-0 border-t border-app-border p-2.5">
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

        {/* Uma caixa só — textarea em cima, barra de ações embaixo — em vez de
            duas bordas empilhadas (o Capricho vivia fora daqui). É também
            onde entram anexo/microfone no futuro, ao lado do Capricho. */}
        <div className="rounded-xl border border-app-border bg-app-surface-2 transition-colors focus-within:border-app-primary/60">
          <textarea
            ref={textareaRef}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void enviar();
              }
            }}
            rows={1}
            placeholder="O que você quer construir?"
            aria-label="Mensagem para o copiloto"
            className="max-h-40 min-h-10 w-full resize-none bg-transparent px-3 pt-2.5 pb-1 text-sm outline-none placeholder:text-app-muted"
          />

          <div className="flex items-center justify-between gap-1.5 px-2 pb-2">
            <button
              type="button"
              onClick={() => setCapricho((atual) => !atual)}
              aria-pressed={capricho}
              title="Modo cuidadoso: planeja tudo antes de construir e pensa mais — demora mais, erra menos"
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors duration-150 ease-app",
                capricho
                  ? "border-app-accent bg-app-accent/15 text-app-accent"
                  : "border-app-border text-app-muted hover:text-app-text",
              )}
            >
              <Brain size={12} />
              Capricho
            </button>

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
    </div>
  );
}

type PerguntaDaIa = {
  toolCallId: string;
  input: { question: string; options: string[]; allowFreeText?: boolean };
};

/** Uma mensagem já tem algo pra mostrar? Usado só pra decidir o "Pensando…". */
function temConteudoVisivel(message: { parts?: { type: string }[] }): boolean {
  return Boolean(
    message.parts?.some((part) => {
      if (part.type === "text") return Boolean((part as unknown as { text?: string }).text?.trim());
      if (part.type === "reasoning") return Boolean((part as unknown as { text?: string }).text?.trim());
      return part.type.startsWith("tool-");
    }),
  );
}

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
    <div className="absolute right-2.5 bottom-full left-2.5 z-10 mb-2 rounded-xl border border-app-accent/60 bg-app-surface p-3 shadow-app-lg">
      <div className="mb-2.5 flex items-start gap-2">
        <MessageCircleQuestionMark size={14} className="mt-0.5 shrink-0 text-app-accent" />
        <div className="text-sm leading-snug">
          <ChatMarkdown text={pergunta.question} />
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {pergunta.options.map((opcao) => (
          <button
            key={opcao}
            type="button"
            onClick={() => onResponder(opcao)}
            className="rounded-full border border-app-border bg-app-surface-2 px-3 py-1.5 text-xs transition-colors duration-150 ease-app hover:border-app-accent hover:bg-app-accent/10 hover:text-app-text"
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
      <p className="ml-6 self-end rounded-xl rounded-br-sm bg-app-primary/15 px-3 py-2 text-sm break-words whitespace-pre-wrap">
        {texto}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {message.parts.map((part, index) => {
        if (part.type === "reasoning") {
          const texto = (part as unknown as { text: string }).text;
          if (!texto?.trim()) return null;
          const streaming = (part as unknown as { state?: string }).state === "streaming";
          return <Raciocinio key={index} texto={texto} streaming={streaming} />;
        }

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

          const ferramenta = part.type.slice("tool-".length);
          const falhou = chamada.output?.ok === false;

          // O erro técnico (validação de schema, id que não existe) volta
          // pro modelo corrigir na próxima chamada — não serve pra quem está
          // lendo o chat. Aqui mostramos só que algo foi ajustado.
          const rotulo =
            chamada.output?.resumo ??
            (falhou ? "Ajustando um detalhe" : RÓTULOS_DE_FERRAMENTA[ferramenta] ?? "Editando");
          const rodando = chamada.state === "input-streaming" || chamada.state === "input-available";
          const Icone = ÍCONES_DE_FERRAMENTA[ferramenta] ?? Wrench;

          return (
            <div
              key={index}
              className={cn(
                "flex items-start gap-2 rounded-lg border border-app-border/60 bg-app-surface-2/40 px-2 py-1.5 text-xs",
                falhou && "border-app-danger/40 text-app-danger",
              )}
            >
              <span
                className={cn(
                  "mt-px grid h-4 w-4 shrink-0 place-items-center rounded",
                  falhou
                    ? "text-app-danger"
                    : rodando
                      ? "text-app-accent"
                      : "text-app-success",
                )}
              >
                <Icone size={11} />
              </span>
              {rodando ? (
                <ShimmerText className="flex-1">{rotulo}</ShimmerText>
              ) : (
                <span className={cn("flex-1", !falhou && "text-app-muted")}>{rotulo}</span>
              )}
            </div>
          );
        }

        return null;
      })}
    </div>
  );
}

/**
 * Trilha de raciocínio do modo cuidadoso.
 *
 * O `reasoning` já chegava do provider (a rota manda `effort: "high"`) e era
 * descartado no render — este painel simplesmente ignorava qualquer part que
 * não fosse texto ou ferramenta. Recolhido por padrão: é contexto pra quem
 * quiser auditar, não a resposta.
 */
function Raciocinio({ texto, streaming }: { texto: string; streaming: boolean }) {
  return (
    <details className="group rounded-lg border border-app-border/60 bg-app-surface-2/30">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 px-2 py-1.5 text-xs text-app-muted marker:content-none hover:text-app-text">
        <ChevronRight size={11} className="shrink-0 transition-transform group-open:rotate-90" />
        <Brain size={11} className="shrink-0" />
        {streaming ? <ShimmerText>Raciocinando…</ShimmerText> : <span>Raciocínio</span>}
      </summary>
      {/* Markdown, não texto cru: o raciocínio vem com `**negrito**` e listas,
          que apareceriam com os asteriscos à mostra. */}
      <div className="border-t border-app-border/60 px-2.5 py-2 text-xs leading-relaxed text-app-muted">
        <ChatMarkdown text={texto} />
      </div>
    </details>
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

const ÍCONES_DE_FERRAMENTA: Record<string, ComponentType<{ size?: number; className?: string }>> = {
  add_step: FilePlus2,
  update_step: PencilLine,
  remove_step: Trash2,
  add_block: Blocks,
  add_blocks: Blocks,
  update_block: PencilLine,
  remove_block: Trash2,
  move_block: ArrowUpDown,
  set_step_logic: GitBranch,
  branch_by_answer: Split,
  check_funnel: CheckCheck,
  ask_user: MessageCircleQuestionMark,
  set_theme: Palette,
  submit_plan: ClipboardList,
  set_variables: Variable,
};
