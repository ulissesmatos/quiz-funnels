import type { CSSProperties } from "react";

import type { ColorValue, RadiusValue, SpaceValue } from "../schema/common";
import type { Theme } from "../schema/theme";

/**
 * O tema vira CSS variables no elemento raiz do funil. Todo bloco consome
 * variável em vez de valor literal, então trocar o tema repinta tudo sem
 * reprocessar nenhum bloco — e o editor consegue mostrar a mudança na hora.
 */

const colorTokens = [
  "bg",
  "surface",
  "text",
  "muted",
  "primary",
  "primaryFg",
  "accent",
  "border",
  "success",
  "danger",
] as const;

const spaceTokens = ["xs", "sm", "md", "lg", "xl", "2xl"] as const;
const radiusTokens = ["sm", "md", "lg", "xl"] as const;

/** Escala tipográfica base em px, multiplicada por `theme.typography.scale`. */
const fontSizes = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 22,
  "2xl": 28,
  "3xl": 34,
  "4xl": 42,
} as const;

const shadows = {
  none: "none",
  sm: "0 1px 2px rgba(0,0,0,.12)",
  md: "0 4px 16px rgba(0,0,0,.18)",
  lg: "0 12px 32px rgba(0,0,0,.24)",
  xl: "0 24px 60px rgba(0,0,0,.32)",
} as const;

export function themeToCssVars(theme: Theme): CSSProperties {
  const vars: Record<string, string> = {};

  for (const token of colorTokens) {
    vars[`--fn-color-${kebab(token)}`] = theme.colors[token];
  }

  // Aviso não entra na lista acima porque é opcional no tema.
  vars["--fn-color-warning"] = theme.colors.warning ?? "#eab308";

  for (const token of spaceTokens) {
    vars[`--fn-space-${token}`] = `${theme.spacing[token]}px`;
  }

  for (const token of radiusTokens) {
    vars[`--fn-radius-${token}`] = `${theme.radius[token]}px`;
  }
  vars["--fn-radius-none"] = "0px";
  vars["--fn-radius-full"] = "9999px";

  const scale = theme.typography.scale;
  for (const [token, size] of Object.entries(fontSizes)) {
    vars[`--fn-text-${token}`] = `${Math.round(size * scale)}px`;
  }

  for (const [token, value] of Object.entries(shadows)) {
    vars[`--fn-shadow-${token}`] = value;
  }

  vars["--fn-font-heading"] = fontStack(theme.typography.heading.family);
  vars["--fn-font-body"] = fontStack(theme.typography.body.family);
  vars["--fn-weight-heading"] = String(theme.typography.heading.weight);
  vars["--fn-weight-body"] = String(theme.typography.body.weight);

  vars["--fn-content-width"] = `${theme.contentWidth}px`;
  vars["--fn-button-radius"] = `var(--fn-radius-${theme.button.radius})`;
  vars["--fn-button-shadow"] = `var(--fn-shadow-${theme.button.shadow})`;

  return vars as CSSProperties;
}

/**
 * Resolve uma cor: nome de token vira `var(--fn-color-*)`, qualquer outra coisa
 * passa direto como valor CSS.
 */
export function resolveColor(value: ColorValue | undefined): string | undefined {
  if (!value) return undefined;
  return (colorTokens as readonly string[]).includes(value)
    ? `var(--fn-color-${kebab(value)})`
    : value;
}

export function resolveSpace(value: SpaceValue | undefined): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value === "number") return `${value}px`;
  if (value === "none") return "0px";
  return `var(--fn-space-${value})`;
}

export function resolveRadius(value: RadiusValue | undefined): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value === "number") return `${value}px`;
  return `var(--fn-radius-${value})`;
}

export function resolveFontSize(
  value: number | keyof typeof fontSizes | undefined,
): string | undefined {
  if (value === undefined) return undefined;
  return typeof value === "number" ? `${value}px` : `var(--fn-text-${value})`;
}

export function resolveShadow(value: keyof typeof shadows | undefined): string | undefined {
  return value === undefined ? undefined : `var(--fn-shadow-${value})`;
}

/**
 * Fontes do Google usadas no funil. O `<head>` da página pública só carrega as
 * famílias que o tema realmente pede.
 */
export function googleFontsHref(theme: Theme): string | null {
  const families = new Set<string>();

  for (const font of [theme.typography.heading, theme.typography.body]) {
    // Fonte com URL própria é carregada por @font-face, não pelo Google.
    if (!font.url && font.family) families.add(font.family);
  }

  if (families.size === 0) return null;

  const params = [...families]
    .map((family) => `family=${encodeURIComponent(family).replace(/%20/g, "+")}:wght@300;400;500;600;700;800`)
    .join("&");

  return `https://fonts.googleapis.com/css2?${params}&display=swap`;
}

/** Regras `@font-face` para as fontes customizadas do tema, se houver. */
export function customFontFaces(theme: Theme): string {
  const faces: string[] = [];

  for (const font of [theme.typography.heading, theme.typography.body]) {
    if (font.url) {
      faces.push(
        `@font-face{font-family:"${cssEscape(font.family)}";src:url("${cssEscape(font.url)}");font-display:swap;font-weight:${font.weight};}`,
      );
    }
  }

  return faces.join("");
}

function fontStack(family: string): string {
  return `"${cssEscape(family)}", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
}

function kebab(value: string): string {
  return value.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
}

/** Evita que um nome de fonte ou URL vindo do documento quebre o CSS gerado. */
function cssEscape(value: string): string {
  return value.replace(/["\\<>]/g, "");
}
