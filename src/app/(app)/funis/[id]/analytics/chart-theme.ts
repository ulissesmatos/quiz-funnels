/**
 * Aparência compartilhada dos gráficos do Recharts.
 *
 * O objeto de `Tooltip` era idêntico byte a byte em três arquivos, e as props
 * de eixo divergiram entre eles sem intenção — um gráfico já tinha ficado com
 * a linha do eixo visível e os outros não.
 *
 * Ficam como objetos, não componentes: o Recharts inspeciona os filhos por
 * tipo pra montar o gráfico, e envolver `<Tooltip>` num wrapper próprio quebra
 * esse reconhecimento.
 */
export const TOOLTIP_STYLE = {
  contentStyle: {
    background: "var(--color-app-surface)",
    border: "1px solid var(--color-app-border)",
    borderRadius: 8,
    fontSize: 12,
    color: "var(--color-app-text)",
  },
  labelStyle: { color: "var(--color-app-muted)" },
  cursor: { fill: "var(--color-app-surface-2)", opacity: 0.4 },
} as const;

/** Eixo de rótulos (categorias). */
export const EIXO_CATEGORIA = {
  tick: { fill: "var(--color-app-muted)", fontSize: 11 },
  tickLine: false,
  axisLine: false,
} as const;

/** Eixo de valores — sem casas decimais, porque tudo aqui é contagem. */
export const EIXO_VALOR = {
  allowDecimals: false,
  tick: { fill: "var(--color-app-muted)", fontSize: 11 },
  tickLine: false,
  axisLine: false,
} as const;

export const GRADE = {
  stroke: "var(--color-app-border)",
  vertical: false,
} as const;
