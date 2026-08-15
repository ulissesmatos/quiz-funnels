"use client";

import {
  ChevronDown,
  CircleAlert,
  CircleCheck,
  Info,
  Star,
  TriangleAlert,
  icons,
} from "lucide-react";
import { useId, useState, type CSSProperties } from "react";

import type { PropsOf } from "../../schema/block";
import { RichText, plainText } from "../rich-text";
import { useFunnelRuntime } from "../runtime-context";
import { splitResponsive } from "../style";

const ICONE_PADRAO = {
  info: Info,
  sucesso: CircleCheck,
  atencao: TriangleAlert,
  erro: CircleAlert,
} as const;

export function AlertBlock({ props }: { props: PropsOf<"alert"> }) {
  const { context } = useFunnelRuntime();

  const Personalizado = props.icon ? icons[props.icon as keyof typeof icons] : null;
  const Icone = Personalizado ?? ICONE_PADRAO[props.variant];

  return (
    <div className="fn-alert" data-variant={props.variant} role="note">
      <Icone size={18} className="fn-alert-icon" aria-hidden />
      <div className="fn-alert-body">
        {props.title && <strong className="fn-alert-title">{plainText(props.title, context)}</strong>}
        <RichText as="div" text={props.text} context={context} className="fn-alert-text" />
      </div>
    </div>
  );
}

export function CardsBlock({ props }: { props: PropsOf<"cards"> }) {
  const { context } = useFunnelRuntime();
  const [base, md] = splitResponsive(props.columns);

  return (
    <div
      className="fn-cards"
      data-has-md={md !== undefined}
      style={
        {
          gridTemplateColumns: `repeat(${base ?? 1}, minmax(0, 1fr))`,
          "--fn-cards-md": String(md ?? base ?? 1),
        } as CSSProperties
      }
    >
      {props.items.map((item, index) => {
        const Icone = item.icon ? icons[item.icon as keyof typeof icons] : null;

        return (
          <div key={index} className="fn-card">
            {item.emoji ? (
              <span className="fn-card-emoji" aria-hidden>
                {item.emoji}
              </span>
            ) : Icone ? (
              <Icone size={22} className="fn-card-icon" aria-hidden />
            ) : null}

            <strong className="fn-card-title">{plainText(item.title, context)}</strong>
            {item.description && (
              <RichText as="div" text={item.description} context={context} className="fn-card-desc" />
            )}
          </div>
        );
      })}
    </div>
  );
}

function Estrelas({ nota }: { nota: number }) {
  const cheias = Math.round(nota);

  return (
    <span className="fn-stars" aria-label={`${nota} de 5 estrelas`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} size={13} fill={i < cheias ? "currentColor" : "none"} aria-hidden />
      ))}
    </span>
  );
}

export function TestimonialsBlock({ props }: { props: PropsOf<"testimonials"> }) {
  const { context } = useFunnelRuntime();

  return (
    <div className="fn-testimonials" data-layout={props.layout}>
      {props.items.map((item, index) => (
        <figure key={index} className="fn-testimonial">
          <div className="fn-testimonial-head">
            {item.avatar?.url ? (
              <img
                className="fn-avatar"
                src={item.avatar.url}
                alt={plainText(item.avatar.alt, context)}
                loading="lazy"
              />
            ) : (
              <span className="fn-avatar fn-avatar--letra" aria-hidden>
                {item.name.charAt(0)}
              </span>
            )}

            <figcaption className="fn-testimonial-who">
              <strong>{item.name}</strong>
              {item.handle && <span className="fn-testimonial-handle">{item.handle}</span>}
            </figcaption>

            {props.showRating && item.rating !== undefined && <Estrelas nota={item.rating} />}
          </div>

          <RichText text={item.text} context={context} className="fn-testimonial-text" />
        </figure>
      ))}
    </div>
  );
}

/**
 * A faixa é duplicada e o CSS anima de 0 a -50%: quando a primeira cópia sai,
 * a segunda já está exatamente no lugar dela, então o loop não tem emenda.
 */
export function MarqueeBlock({ props }: { props: PropsOf<"marquee"> }) {
  const { context } = useFunnelRuntime();
  const itens = [...props.items, ...props.items];

  return (
    <div
      className="fn-marquee"
      data-pause={props.pauseOnHover}
      style={
        {
          "--fn-marquee-speed": `${props.speed}s`,
          "--fn-marquee-direction": props.direction === "direita" ? "reverse" : "normal",
        } as CSSProperties
      }
    >
      <div className="fn-marquee-track" aria-hidden={false}>
        {itens.map((item, index) => (
          <div
            key={index}
            className="fn-marquee-item"
            // A segunda metade é cópia visual: anunciá-la duplicaria a leitura.
            aria-hidden={index >= props.items.length}
          >
            {item.avatar?.url && (
              <img
                className="fn-avatar fn-avatar--sm"
                src={item.avatar.url}
                alt={plainText(item.avatar.alt, context)}
                loading="lazy"
              />
            )}
            <span>
              {item.name && <strong className="fn-marquee-name">{item.name}</strong>}
              <span className="fn-marquee-text">{plainText(item.text, context)}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function FaqBlock({ props }: { props: PropsOf<"faq"> }) {
  const { context } = useFunnelRuntime();
  const id = useId();
  const [abertos, setAbertos] = useState<number[]>([]);

  function alternar(index: number) {
    setAbertos((atual) => {
      if (atual.includes(index)) return atual.filter((i) => i !== index);
      return props.allowMultipleOpen ? [...atual, index] : [index];
    });
  }

  return (
    <div className="fn-faq">
      {props.items.map((item, index) => {
        const aberto = abertos.includes(index);

        return (
          <div key={index} className="fn-faq-item" data-open={aberto}>
            <button
              type="button"
              className="fn-faq-question"
              aria-expanded={aberto}
              aria-controls={`${id}-${index}`}
              onClick={() => alternar(index)}
            >
              <span>{plainText(item.question, context)}</span>
              <ChevronDown size={16} className="fn-faq-chevron" aria-hidden />
            </button>

            <div id={`${id}-${index}`} className="fn-faq-answer" hidden={!aberto}>
              <RichText text={item.answer} context={context} className="fn-faq-answer-text" />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function TermsBlock({ props }: { props: PropsOf<"terms"> }) {
  const { context } = useFunnelRuntime();
  return <RichText text={props.text} context={context} className="fn-terms" />;
}
