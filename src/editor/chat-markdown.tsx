import { Fragment, type ReactNode } from "react";

import { safeHref } from "@/funnel/render/rich-text";
import { cn } from "@/lib/cn";

/**
 * Markdown do chat do copiloto: negrito, itálico, código inline, links,
 * listas e blocos de código — o subconjunto que o modelo realmente usa em
 * texto corrido e em perguntas do `ask_user`.
 *
 * Parseado em elementos React, nunca `dangerouslySetInnerHTML` — mesmo
 * motivo do `RichText` do funil: o texto vem do modelo, e injetar HTML cru
 * seria XSS aberto.
 */

const INLINE = /(\*\*[^*\n]+\*\*|\*[^*\n]+\*|`[^`\n]+`|\[[^\]\n]+\]\([^)\s]+\))/g;

type Bloco =
  | { tipo: "paragrafo"; texto: string }
  | { tipo: "titulo"; nivel: number; texto: string }
  | { tipo: "lista"; ordenada: boolean; itens: string[] }
  | { tipo: "codigo"; texto: string };

export function ChatMarkdown({ text }: { text: string }) {
  const blocos = parsearBlocos(text.trim());

  return (
    <div className="flex flex-col gap-1.5">
      {blocos.map((bloco, index) => renderBloco(bloco, index))}
    </div>
  );
}

function parsearBlocos(fonte: string): Bloco[] {
  const linhas = fonte.split("\n");
  const blocos: Bloco[] = [];
  let i = 0;

  while (i < linhas.length) {
    const linha = linhas[i];

    if (!linha.trim()) {
      i++;
      continue;
    }

    if (linha.startsWith("```")) {
      const linhasDeCodigo: string[] = [];
      i++;
      while (i < linhas.length && !linhas[i].startsWith("```")) {
        linhasDeCodigo.push(linhas[i]);
        i++;
      }
      i++; // fecha a cerca, se houver
      blocos.push({ tipo: "codigo", texto: linhasDeCodigo.join("\n") });
      continue;
    }

    const titulo = /^(#{1,3})\s+(.*)$/.exec(linha);
    if (titulo) {
      blocos.push({ tipo: "titulo", nivel: titulo[1].length, texto: titulo[2] });
      i++;
      continue;
    }

    if (/^[-*]\s+/.test(linha)) {
      const itens: string[] = [];
      while (i < linhas.length && /^[-*]\s+/.test(linhas[i])) {
        itens.push(linhas[i].replace(/^[-*]\s+/, ""));
        i++;
      }
      blocos.push({ tipo: "lista", ordenada: false, itens });
      continue;
    }

    if (/^\d+[.)]\s+/.test(linha)) {
      const itens: string[] = [];
      while (i < linhas.length && /^\d+[.)]\s+/.test(linhas[i])) {
        itens.push(linhas[i].replace(/^\d+[.)]\s+/, ""));
        i++;
      }
      blocos.push({ tipo: "lista", ordenada: true, itens });
      continue;
    }

    const linhasDoParagrafo: string[] = [];
    while (
      i < linhas.length &&
      linhas[i].trim() &&
      !linhas[i].startsWith("```") &&
      !/^(#{1,3})\s+/.test(linhas[i]) &&
      !/^[-*]\s+/.test(linhas[i]) &&
      !/^\d+[.)]\s+/.test(linhas[i])
    ) {
      linhasDoParagrafo.push(linhas[i]);
      i++;
    }
    blocos.push({ tipo: "paragrafo", texto: linhasDoParagrafo.join("\n") });
  }

  return blocos;
}

function renderBloco(bloco: Bloco, index: number): ReactNode {
  switch (bloco.tipo) {
    case "titulo": {
      const Tag = `h${Math.min(bloco.nivel + 2, 4)}` as "h3" | "h4";
      return (
        <Tag key={index} className="text-sm font-semibold">
          {renderInline(bloco.texto, `t${index}`)}
        </Tag>
      );
    }

    case "lista": {
      const Lista = bloco.ordenada ? "ol" : "ul";
      return (
        <Lista
          key={index}
          className={cn("space-y-0.5 pl-4 text-sm leading-relaxed", bloco.ordenada ? "list-decimal" : "list-disc")}
        >
          {bloco.itens.map((item, i) => (
            <li key={i}>{renderInline(item, `l${index}-${i}`)}</li>
          ))}
        </Lista>
      );
    }

    case "codigo":
      return (
        <pre key={index} className="overflow-x-auto rounded-lg bg-app-surface-2 p-2 text-xs">
          <code>{bloco.texto}</code>
        </pre>
      );

    case "paragrafo":
    default:
      return (
        <p key={index} className="text-sm leading-relaxed whitespace-pre-wrap">
          {renderInline(bloco.texto, `p${index}`)}
        </p>
      );
  }
}

function renderInline(fonte: string, prefixo: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const segmentos = fonte.split(INLINE);

  segmentos.forEach((segmento, index) => {
    if (!segmento) return;
    const key = `${prefixo}-${index}`;

    if (segmento.startsWith("**") && segmento.endsWith("**") && segmento.length > 4) {
      nodes.push(<strong key={key}>{segmento.slice(2, -2)}</strong>);
      return;
    }

    if (segmento.startsWith("`") && segmento.endsWith("`") && segmento.length > 2) {
      nodes.push(
        <code key={key} className="rounded bg-app-surface-2 px-1 py-0.5 text-[0.85em]">
          {segmento.slice(1, -1)}
        </code>,
      );
      return;
    }

    if (segmento.startsWith("*") && segmento.endsWith("*") && segmento.length > 2) {
      nodes.push(<em key={key}>{segmento.slice(1, -1)}</em>);
      return;
    }

    const link = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(segmento);
    if (link) {
      const href = safeHref(link[2]);
      nodes.push(
        href ? (
          <a key={key} href={href} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
            {link[1]}
          </a>
        ) : (
          <Fragment key={key}>{link[1]}</Fragment>
        ),
      );
      return;
    }

    const linhas = segmento.split("\n");
    linhas.forEach((linha, linhaIndex) => {
      if (linhaIndex > 0) nodes.push(<br key={`${key}-br-${linhaIndex}`} />);
      if (linha) nodes.push(<Fragment key={`${key}-${linhaIndex}`}>{linha}</Fragment>);
    });
  });

  return nodes;
}
