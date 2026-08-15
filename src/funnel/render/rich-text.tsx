import { Fragment, type ReactNode } from "react";

import type { FunnelContext } from "../logic/context";
import { interpolate } from "../logic/interpolate";

/**
 * Markdown inline mínimo: `**negrito**`, `*itálico*`, `[texto](url)`.
 *
 * É parseado em elementos React, nunca injetado como HTML. Isso importa porque
 * o texto vem do documento do funil, que pode ter sido escrito pela IA ou
 * colado pelo usuário — `dangerouslySetInnerHTML` aqui seria um XSS aberto.
 */

const INLINE = /(\*\*[^*\n]+\*\*|\*[^*\n]+\*|\[[^\]\n]+\]\([^)\s]+\))/g;

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
  const resolved = interpolate(text, context);
  const paragraphs = resolved.split(/\n{2,}/);

  const attrs: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(data ?? {})) {
    attrs[`data-${key}`] = value;
  }

  if (paragraphs.length === 1) {
    return (
      <Tag className={className} style={style} {...attrs}>
        {renderInline(paragraphs[0])}
      </Tag>
    );
  }

  return (
    <>
      {paragraphs.map((paragraph, index) => (
        <Tag key={index} className={className} style={style} {...attrs}>
          {renderInline(paragraph)}
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

function renderInline(source: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const segments = source.split(INLINE);

  segments.forEach((segment, index) => {
    if (!segment) return;

    if (segment.startsWith("**") && segment.endsWith("**")) {
      nodes.push(<strong key={index}>{segment.slice(2, -2)}</strong>);
      return;
    }

    if (segment.startsWith("*") && segment.endsWith("*")) {
      nodes.push(<em key={index}>{segment.slice(1, -1)}</em>);
      return;
    }

    const link = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(segment);
    if (link) {
      const href = safeHref(link[2]);
      nodes.push(
        href ? (
          <a key={index} href={href} target="_blank" rel="noopener noreferrer">
            {link[1]}
          </a>
        ) : (
          <Fragment key={index}>{link[1]}</Fragment>
        ),
      );
      return;
    }

    // Quebra simples (\n) vira <br>; quebra dupla já virou parágrafo.
    const lines = segment.split("\n");
    lines.forEach((line, lineIndex) => {
      if (lineIndex > 0) nodes.push(<br key={`${index}-br-${lineIndex}`} />);
      if (line) nodes.push(<Fragment key={`${index}-${lineIndex}`}>{line}</Fragment>);
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
