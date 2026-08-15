"use client";

import { Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import type { PropsOf } from "../../schema/block";
import type { Theme } from "../../schema/theme";
import { RichText, plainText } from "../rich-text";
import { useFunnelRuntime } from "../runtime-context";

export function PricingBlock({ props, theme }: { props: PropsOf<"pricing">; theme: Theme }) {
  const { context, runAction, interactive } = useFunnelRuntime();

  return (
    <div className="fn-pricing" data-highlighted={props.highlighted}>
      {props.badge && <span className="fn-pricing-badge">{plainText(props.badge, context)}</span>}

      <div className="fn-pricing-body">
        <strong className="fn-pricing-title">{plainText(props.title, context)}</strong>
        {props.description && (
          <RichText text={props.description} context={context} className="fn-pricing-desc" />
        )}

        <div className="fn-pricing-price-row">
          <div className="fn-pricing-price-main">
            <span className="fn-pricing-price">{plainText(props.price, context)}</span>
            {props.priceNote && <span className="fn-pricing-note">{props.priceNote}</span>}
          </div>

          {(props.oldPrice || props.discountLabel) && (
            <div className="fn-pricing-old">
              {props.discountLabel && (
                <span className="fn-pricing-discount">{props.discountLabel}</span>
              )}
              {props.oldPrice && <s>{props.oldPrice}</s>}
            </div>
          )}
        </div>

        {props.installments && <p className="fn-pricing-installments">{props.installments}</p>}

        {props.features.length > 0 && (
          <ul className="fn-pricing-features">
            {props.features.map((feature, index) => (
              <li key={index}>
                <Check size={14} strokeWidth={3} aria-hidden />
                {plainText(feature, context)}
              </li>
            ))}
          </ul>
        )}

        <button
          type="button"
          className="fn-button"
          data-variant={theme.button.variant}
          data-size={theme.button.size}
          data-full="true"
          data-uppercase={theme.button.uppercase}
          onClick={() => interactive && runAction(props.action)}
        >
          <span className="fn-button-row">{plainText(props.actionLabel, context)}</span>
        </button>
      </div>
    </div>
  );
}

/**
 * Contagem regressiva.
 *
 * No modo duração o prazo é gravado em `sessionStorage` por bloco: sem isso, a
 * pessoa voltaria uma tela e ganharia 15 minutos novos, o que faz o relógio
 * mentir na cara de quem está olhando.
 */
export function CountdownBlock({ props, blockId }: { props: PropsOf<"countdown">; blockId: string }) {
  const { context, runAction, interactive } = useFunnelRuntime();

  const minutos = props.minutes ?? 15;

  // Data fixa é determinística: vem das props e pode ser derivada no render.
  const prazoFixo =
    props.mode === "data" && props.endsAt ? new Date(props.endsAt).getTime() : null;

  const [prazoDaSessao, setPrazoDaSessao] = useState<number | null>(null);
  const [restante, setRestante] = useState(minutos * 60_000);
  const disparou = useRef(false);

  const prazo = props.mode === "data" ? prazoFixo : prazoDaSessao;

  /**
   * O prazo por duração depende do relógio e do `sessionStorage` — nenhum dos
   * dois existe no servidor. Calculá-lo no render geraria um horário no HTML e
   * outro na hidratação; por isso ele é lido do sistema externo aqui, uma vez
   * só, que é exatamente o caso que o `useEffect` existe para atender.
   */
  useEffect(() => {
    if (props.mode === "data") return;

    // Guardado por bloco: sem isso, voltar uma tela devolveria 15 minutos
    // novos e o relógio passaria a mentir na cara de quem está olhando.
    const chave = `fn-countdown:${blockId}`;
    const salvo = window.sessionStorage.getItem(chave);

    if (salvo) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- leitura única de estado externo
      setPrazoDaSessao(Number(salvo));
      return;
    }

    const fim = Date.now() + minutos * 60_000;
    window.sessionStorage.setItem(chave, String(fim));
    setPrazoDaSessao(fim);
  }, [blockId, minutos, props.mode]);

  useEffect(() => {
    if (!prazo || !interactive) return;

    const tick = () => {
      const falta = Math.max(0, prazo - Date.now());
      setRestante(falta);

      if (falta === 0 && !disparou.current) {
        disparou.current = true;
        if (props.onEnd) runAction(props.onEnd);
      }
    };

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
    // `runAction` muda a cada render do runtime e reiniciaria o intervalo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prazo, interactive]);

  if (props.mode === "data" && !props.endsAt) return null;

  const expirou = prazo !== null && restante === 0;
  const totalSegundos = Math.floor(restante / 1000);
  const horas = Math.floor(totalSegundos / 3600);
  const minutosRestantes = Math.floor((totalSegundos % 3600) / 60);
  const segundos = totalSegundos % 60;

  return (
    <div className="fn-countdown" data-expired={expirou}>
      {props.label && <span className="fn-countdown-label">{plainText(props.label, context)}</span>}

      {expirou && props.expiredText ? (
        <strong className="fn-countdown-clock">{plainText(props.expiredText, context)}</strong>
      ) : (
        <strong className="fn-countdown-clock" role="timer" aria-live="off">
          {horas > 0 && <Unidade valor={horas} sufixo="h" />}
          <Unidade valor={minutosRestantes} sufixo="min" />
          <Unidade valor={segundos} sufixo="s" />
        </strong>
      )}
    </div>
  );
}

function Unidade({ valor, sufixo }: { valor: number; sufixo: string }) {
  return (
    <span className="fn-countdown-unit">
      {String(valor).padStart(2, "0")}
      <small>{sufixo}</small>
    </span>
  );
}

const INTENSIDADE = { sutil: 60, medio: 140, forte: 260 } as const;

export function ConfettiBlock({ props }: { props: PropsOf<"confetti"> }) {
  const { interactive } = useFunnelRuntime();
  const jaDisparou = useRef(false);

  useEffect(() => {
    if (!interactive || jaDisparou.current) return;
    jaDisparou.current = true;

    let cancelado = false;

    // Import dinâmico: quem não usa o bloco não carrega a biblioteca.
    void import("canvas-confetti").then(({ default: confetti }) => {
      if (cancelado) return;

      const cores =
        props.colors && props.colors.length > 0 ? props.colors : lerCoresDoTema();

      const total = INTENSIDADE[props.intensity];
      const fim = Date.now() + props.durationMs;

      const disparar = () => {
        confetti({
          particleCount: Math.round(total / 8),
          spread: 70,
          startVelocity: 38,
          origin: { y: 0.35 },
          colors: cores,
          disableForReducedMotion: true,
        });

        if (Date.now() < fim && !cancelado) requestAnimationFrame(disparar);
      };

      disparar();
    });

    return () => {
      cancelado = true;
    };
  }, [interactive, props.colors, props.durationMs, props.intensity]);

  // Puramente decorativo: o confete é desenhado num canvas próprio, fora do fluxo.
  return null;
}

/** Sem cores declaradas, o confete usa a identidade do funil. */
function lerCoresDoTema(): string[] {
  if (typeof window === "undefined") return ["#6c4bf6"];

  const raiz = document.querySelector(".fn-root");
  if (!raiz) return ["#6c4bf6"];

  const estilo = getComputedStyle(raiz);
  return [
    estilo.getPropertyValue("--fn-color-primary").trim() || "#6c4bf6",
    estilo.getPropertyValue("--fn-color-accent").trim() || "#22d3a7",
    estilo.getPropertyValue("--fn-color-text").trim() || "#ffffff",
  ];
}

/**
 * Embed de terceiros.
 *
 * Vai para dentro de um iframe com `sandbox` **sem** `allow-same-origin`: o
 * conteúdo roda em origem opaca, sem acesso a cookies, storage ou DOM da página.
 * O produto é multi-tenant — sem esse isolamento, um membro da organização
 * poderia injetar script e capturar os leads de um funil que não é dele.
 */
export function EmbedBlock({ props }: { props: PropsOf<"embed"> }) {
  if (!props.html.trim()) {
    return (
      <div className="fn-media-placeholder">
        <span>Cole aqui o HTML do embed</span>
      </div>
    );
  }

  const documento = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;padding:0;font-family:system-ui,sans-serif;overflow:${props.scrolling ? "auto" : "hidden"}}</style></head><body>${props.html}</body></html>`;

  return (
    <iframe
      className="fn-embed"
      srcDoc={documento}
      sandbox="allow-scripts allow-popups allow-forms allow-popups-to-escape-sandbox"
      style={{ height: props.height }}
      scrolling={props.scrolling ? "yes" : "no"}
      title="Conteúdo incorporado"
      loading="lazy"
    />
  );
}
