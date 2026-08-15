"use client";

import { Check, X } from "lucide-react";
import { useId, type CSSProperties } from "react";

import type { PropsOf } from "../../schema/block";
import { plainText } from "../rich-text";
import { useFunnelRuntime } from "../runtime-context";

/**
 * Gráficos desenhados em SVG à mão.
 *
 * A regra que vale para os três: **um matiz só, em dois níveis de ênfase**.
 * As cores vêm do tema escolhido pelo cliente em tempo de execução, então não
 * há como validar uma paleta categórica antes; uma rampa de opacidade sobre a
 * mesma cor é monotônica em luminosidade e, por isso, legível para daltonismo
 * com qualquer cor. A identidade de cada marca vem do rótulo ao lado, nunca só
 * da cor — e os valores usam a cor de texto do tema, não a da série.
 */

// ── Gráfico de barras ──────────────────────────────────────────

export function ChartBlock({ props }: { props: PropsOf<"chart"> }) {
  const { context } = useFunnelRuntime();

  const teto = props.max ?? Math.max(...props.bars.map((b) => b.value), 1);
  const unidade = props.unit ?? "";

  const rotuloDoValor = (bar: PropsOf<"chart">["bars"][number]) =>
    bar.valueLabel ?? `${formatarNumero(bar.value)}${unidade}`;

  const resumo = props.bars.map((b) => `${b.label}: ${rotuloDoValor(b)}`).join("; ");

  return (
    <figure className="fn-chart" role="img" aria-label={`${props.title ?? "Comparação"}. ${resumo}`}>
      {props.title && <figcaption className="fn-chart-title">{plainText(props.title, context)}</figcaption>}

      <div className="fn-chart-plot" data-orientation={props.orientation}>
        {props.bars.map((bar, index) => {
          const proporcao = Math.max(0, Math.min(1, bar.value / teto));

          return (
            <div key={index} className="fn-bar-row" data-highlight={bar.highlight ?? false}>
              <span className="fn-bar-label">{plainText(bar.label, context)}</span>

              <div className="fn-bar-track">
                <div
                  className="fn-bar-fill"
                  style={
                    props.orientation === "vertical"
                      ? { height: `${proporcao * 100}%` }
                      : { width: `${proporcao * 100}%` }
                  }
                />
              </div>

              <span className="fn-bar-value">{rotuloDoValor(bar)}</span>
            </div>
          );
        })}
      </div>
    </figure>
  );
}

// ── Curva de progresso ─────────────────────────────────────────

const LARGURA = 320;
const ALTURA = 170;
const MARGEM = { topo: 26, base: 26, esquerda: 10, direita: 10 };

export function CartesianBlock({ props }: { props: PropsOf<"cartesian"> }) {
  const { context } = useFunnelRuntime();
  const gradienteId = useId();

  const valores = props.points.map((p) => p.value);
  const minimo = Math.min(...valores);
  const maximo = Math.max(...valores);
  const amplitude = maximo - minimo || 1;

  const largura = LARGURA - MARGEM.esquerda - MARGEM.direita;
  const altura = ALTURA - MARGEM.topo - MARGEM.base;

  const pontos = props.points.map((ponto, index) => ({
    ...ponto,
    x: MARGEM.esquerda + (index / Math.max(1, props.points.length - 1)) * largura,
    y: MARGEM.topo + altura - ((ponto.value - minimo) / amplitude) * altura,
  }));

  const linha = curvaSuave(pontos);
  const area = `${linha} L ${pontos[pontos.length - 1].x} ${ALTURA - MARGEM.base} L ${pontos[0].x} ${ALTURA - MARGEM.base} Z`;

  const indiceVoce = Math.max(0, Math.min(props.youIndex, pontos.length - 1));
  const voce = pontos[indiceVoce];
  const alvo = pontos[pontos.length - 1];

  const resumo = props.points.map((p) => `${p.label}: ${formatarNumero(p.value)}`).join("; ");

  return (
    <figure
      className="fn-cartesian"
      role="img"
      aria-label={`${props.title ?? "Projeção"}. ${resumo}. ${props.youLabel} em ${props.points[indiceVoce].label}.`}
    >
      {props.title && (
        <figcaption className="fn-chart-title">{plainText(props.title, context)}</figcaption>
      )}

      <svg viewBox={`0 0 ${LARGURA} ${ALTURA}`} className="fn-cartesian-svg" aria-hidden>
        <defs>
          <linearGradient id={gradienteId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--fn-color-primary)" stopOpacity="0.32" />
            <stop offset="100%" stopColor="var(--fn-color-primary)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grade recessiva: referência sem competir com a curva. */}
        {[0, 0.5, 1].map((fracao) => (
          <line
            key={fracao}
            x1={MARGEM.esquerda}
            x2={LARGURA - MARGEM.direita}
            y1={MARGEM.topo + altura * fracao}
            y2={MARGEM.topo + altura * fracao}
            className="fn-cartesian-grid"
          />
        ))}

        <path d={area} fill={`url(#${gradienteId})`} />
        <path d={linha} className="fn-cartesian-line" />

        {alvo && props.goalLabel && (
          <circle cx={alvo.x} cy={alvo.y} r="5.5" className="fn-cartesian-goal" />
        )}
        <circle cx={voce.x} cy={voce.y} r="6" className="fn-cartesian-you" />
      </svg>

      <div className="fn-cartesian-marks">
        <span className="fn-cartesian-tag" style={ancorarRotulo((voce.x / LARGURA) * 100)}>
          {plainText(props.youLabel, context)}
        </span>
        {props.goalLabel && alvo && (
          <span
            className="fn-cartesian-tag fn-cartesian-tag--goal"
            style={ancorarRotulo((alvo.x / LARGURA) * 100)}
          >
            {plainText(props.goalLabel, context)}
          </span>
        )}
      </div>

      {props.showAxisLabels && (
        <div className="fn-cartesian-axis">
          {props.points.map((ponto, index) => (
            <span key={index}>{plainText(ponto.label, context)}</span>
          ))}
        </div>
      )}
    </figure>
  );
}

/**
 * Ancora o rótulo sem deixá-lo vazar da caixa.
 *
 * Centralizar sempre no ponto (`translateX(-50%)`) joga metade do texto para
 * fora quando a marca está numa das pontas — que é justamente onde "você" e
 * "objetivo" costumam ficar. Perto da borda, o rótulo encosta nela.
 */
function ancorarRotulo(percentual: number): CSSProperties {
  if (percentual <= 18) return { left: 0 };
  if (percentual >= 82) return { right: 0 };
  return { left: `${percentual}%`, transform: "translateX(-50%)" };
}

/** Catmull-Rom convertido em cúbicas — curva suave sem passar longe dos pontos. */
function curvaSuave(pontos: { x: number; y: number }[]): string {
  if (pontos.length < 2) return "";

  let d = `M ${pontos[0].x} ${pontos[0].y}`;

  for (let i = 0; i < pontos.length - 1; i++) {
    const p0 = pontos[i - 1] ?? pontos[i];
    const p1 = pontos[i];
    const p2 = pontos[i + 1];
    const p3 = pontos[i + 2] ?? p2;

    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
  }

  return d;
}

// ── Nível ──────────────────────────────────────────────────────

export function LevelBlock({ props }: { props: PropsOf<"level"> }) {
  const { context } = useFunnelRuntime();

  // Com scoreKey preenchido a posição vem da pontuação real, então o mesmo
  // bloco devolve um diagnóstico diferente para cada visitante.
  const percentual =
    props.scoreKey && props.scoreMax
      ? Math.max(0, Math.min(100, ((context.scores[props.scoreKey] ?? 0) / props.scoreMax) * 100))
      : Math.max(0, Math.min(100, props.value));

  const arredondado = Math.round(percentual);
  const faixaAtual = props.zones[Math.min(props.zones.length - 1, Math.floor((percentual / 100) * props.zones.length))];

  return (
    <figure
      className="fn-level"
      role="img"
      aria-label={`${props.title ?? "Nível"}: ${faixaAtual}, ${arredondado}%`}
    >
      {props.title && <figcaption className="fn-chart-title">{plainText(props.title, context)}</figcaption>}

      <div className="fn-level-marker-row">
        <span className="fn-level-bubble" style={{ left: `${arredondado}%` }}>
          {plainText(props.markerLabel, context)}
        </span>
      </div>

      <div className="fn-level-track">
        <div className="fn-level-fill" style={{ width: `${arredondado}%` }} />
        <span className="fn-level-knob" style={{ left: `${arredondado}%` }} />
      </div>

      <div className="fn-level-zones" style={{ gridTemplateColumns: `repeat(${props.zones.length}, 1fr)` }}>
        {props.zones.map((zona, index) => (
          <span key={index} data-current={zona === faixaAtual}>
            {plainText(zona, context)}
          </span>
        ))}
      </div>

      {props.showPercent && <span className="fn-level-percent">{arredondado}%</span>}
    </figure>
  );
}

// ── Comparação ─────────────────────────────────────────────────

export function CompareBlock({ props }: { props: PropsOf<"compare"> }) {
  const { context } = useFunnelRuntime();

  return (
    <div className="fn-compare-wrap">
      {props.title && <p className="fn-chart-title">{plainText(props.title, context)}</p>}

      <table className="fn-compare">
        <thead>
          <tr>
            <th />
            {props.columns.map((coluna, index) => (
              <th key={index} data-highlight={index === props.highlightColumn}>
                {plainText(coluna, context)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {props.rows.map((linha, index) => (
            <tr key={index}>
              <th scope="row">{plainText(linha.label, context)}</th>
              {props.columns.map((_, coluna) => (
                <td key={coluna} data-highlight={coluna === props.highlightColumn}>
                  <Celula valor={linha.values[coluna]} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Celula({ valor }: { valor: boolean | string | undefined }) {
  if (valor === true) {
    return (
      <span className="fn-compare-yes" aria-label="sim">
        <Check size={15} strokeWidth={3} aria-hidden />
      </span>
    );
  }

  if (valor === false) {
    return (
      <span className="fn-compare-no" aria-label="não">
        <X size={15} strokeWidth={3} aria-hidden />
      </span>
    );
  }

  return <span className="fn-compare-text">{valor ?? "—"}</span>;
}

function formatarNumero(valor: number): string {
  return Number.isInteger(valor) ? String(valor) : valor.toFixed(1).replace(".", ",");
}
