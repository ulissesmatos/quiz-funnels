import { Fragment, type ReactNode } from "react";

import type { FunnelContext } from "../logic/context";
import { lookupValue } from "../logic/context";
import { interpolate } from "../logic/interpolate";
import { useFunnelRuntime } from "./runtime-context";

/**
 * Markdown inline mínimo: `**negrito**`, `*itálico*`, `[texto](url)`.
 *
 * É parseado em elementos React, nunca injetado como HTML. Isso importa porque
 * o texto vem do documento do funil, que pode ter sido escrito pela IA ou
 * colado pelo usuário — `dangerouslySetInnerHTML` aqui seria um XSS aberto.
 */

const INLINE = /(\*\*[^*\n]+\*\*|\*[^*\n]+\*|\[[^\]\n]+\]\([^)\s]+\))/g;

/** Mesmo padrão de `{{chave}}` de `interpolate.ts`, com grupo de captura para separar do texto ao redor. */
const TOKEN = /(\{\{\s*[a-zA-Z_][a-zA-Z0-9_.]*\s*\}\})/g;

/**
 * Chaves que não dependem de resposta nenhuma — só da posição do step, que o
 * editor já conhece mesmo sem simular ninguém respondendo. Mostrar a tag crua
 * pra estas seria pior que mostrar o valor: "10%" é sempre exatamente o que
 * vai aparecer, não uma adivinhação como `{{objetivo}}` seria.
 */
const CHAVES_SEMPRE_RESOLVIDAS = new Set(["progresso", "passo", "total"]);

export function RichText({
  text,
  context,
  as: Tag = "p",
  className,
  style,
  data,
}: {
  text: string;
  context: FunnelContext;
  as?: "p" | "span" | "div" | "h1" | "h2" | "h3";
  className?: string;
  style?: React.CSSProperties;
  /** Atributos `data-*` no elemento gerado, usados como gancho de CSS. */
  data?: Record<string, string | number>;
}) {
  /**
   * No editor, mostra a tag `{{crua}}` em destaque em vez de trocar por um
   * exemplo — quem monta o funil precisa enxergar onde a interpolação entra,
   * não uma resposta inventada que nem sempre existe (ou nem sempre é a
   * primeira opção do bloco). No funil publicado, mostra o valor de verdade,
   * também em destaque, para a pessoa notar que o funil está falando com ela.
   */
  const { mode } = useFunnelRuntime();
  const bruto = mode === "editor";

  // A interpolação já resolveu tudo antes: paragrafar sobre o texto original
  // (sem substituir ainda) evita que um valor de resposta com `\n\n` quebre a
  // contagem de parágrafos — respostas de verdade nunca têm isso, mas o texto
  // do funil pode.
  const paragraphs = text.split(/\n{2,}/);

  const attrs: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(data ?? {})) {
    attrs[`data-${key}`] = value;
  }

  if (paragraphs.length === 1) {
    return (
      <Tag className={className} style={style} {...attrs}>
        {renderInline(paragraphs[0], context, bruto)}
      </Tag>
    );
  }

  return (
    <>
      {paragraphs.map((paragraph, index) => (
        <Tag key={index} className={className} style={style} {...attrs}>
          {renderInline(paragraph, context, bruto)}
        </Tag>
      ))}
    </>
  );
}

/** Versão sem markdown, para atributos como `alt`, `placeholder` e `title`. */
export function plainText(text: string, context: FunnelContext): string {
  return interpolate(text, context)
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
}

function renderInline(source: string, context: FunnelContext, bruto: boolean): ReactNode[] {
  const nodes: ReactNode[] = [];
  const segments = source.split(INLINE);

  segments.forEach((segment, index) => {
    if (!segment) return;

    if (segment.startsWith("**") && segment.endsWith("**")) {
      nodes.push(
        <strong key={index}>{renderTextWithVars(segment.slice(2, -2), context, bruto, `b${index}`)}</strong>,
      );
      return;
    }

    if (segment.startsWith("*") && segment.endsWith("*")) {
      nodes.push(<em key={index}>{renderTextWithVars(segment.slice(1, -1), context, bruto, `i${index}`)}</em>);
      return;
    }

    const link = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(segment);
    if (link) {
      const href = safeHref(link[2]);
      const inner = renderTextWithVars(link[1], context, bruto, `l${index}`);
      nodes.push(
        href ? (
          <a key={index} href={href} target="_blank" rel="noopener noreferrer">
            {inner}
          </a>
        ) : (
          <Fragment key={index}>{inner}</Fragment>
        ),
      );
      return;
    }

    nodes.push(...renderTextWithVars(segment, context, bruto, `p${index}`));
  });

  return nodes;
}

/**
 * Camada interna do texto: troca `{{chave}}` por um `<span>` em destaque no
 * editor — a tag crua, nunca o valor, exceto para as chaves de
 * `CHAVES_SEMPRE_RESOLVIDAS`, que mostram o valor real mesmo ali. Trata
 * também quebra de linha simples (`\n` → `<br>`) no que sobra.
 *
 * No funil publicado não existe destaque nenhum: quem responde o quiz não
 * pode perceber diferença entre um trecho digitado e um interpolado, então o
 * valor sai como texto comum, igual a qualquer outra palavra da frase.
 */
function renderTextWithVars(
  source: string,
  context: FunnelContext,
  bruto: boolean,
  keyPrefix: string,
): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pieces = source.split(TOKEN);

  pieces.forEach((piece, index) => {
    if (!piece) return;

    const token = /^\{\{\s*([a-zA-Z_][a-zA-Z0-9_.]*)\s*\}\}$/.exec(piece);
    if (token) {
      const chave = token[1];

      if (!bruto || CHAVES_SEMPRE_RESOLVIDAS.has(chave)) {
        nodes.push(<Fragment key={`${keyPrefix}-v${index}`}>{lookupValue(context, chave)}</Fragment>);
        return;
      }

      nodes.push(
        <span key={`${keyPrefix}-v${index}`} className="fn-var">
          {`{{${chave}}}`}
        </span>,
      );
      return;
    }

    // Quebra simples (\n) vira <br>; quebra dupla já virou parágrafo.
    const lines = piece.split("\n");
    lines.forEach((line, lineIndex) => {
      if (lineIndex > 0) nodes.push(<br key={`${keyPrefix}-${index}-br-${lineIndex}`} />);
      if (line) nodes.push(<Fragment key={`${keyPrefix}-${index}-${lineIndex}`}>{line}</Fragment>);
    });
  });

  return nodes;
}

/** Deixa passar só esquemas seguros — barra `javascript:` e afins. */
export function safeHref(url: string): string | null {
  const trimmed = url.trim();

  if (/^(https?:|mailto:|tel:|#|\/)/i.test(trimmed)) return trimmed;
  // Sem esquema tratamos como https, que é o que o usuário quis dizer.
  if (/^[\w.-]+\.[a-z]{2,}(\/|$)/i.test(trimmed)) return `https://${trimmed}`;

  return null;
}
