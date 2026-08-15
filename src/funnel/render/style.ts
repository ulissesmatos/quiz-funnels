import type { CSSProperties } from "react";

import type { Responsive, StyleOverride } from "../schema/common";
import {
  resolveColor,
  resolveFontSize,
  resolveRadius,
  resolveShadow,
  resolveSpace,
} from "../theme/css";

/**
 * Converte o `style` de um bloco em CSS variables aplicadas no wrapper.
 *
 * Por que variáveis e não estilo inline direto: valores responsivos precisam de
 * media query, que não existe em inline style. Emitindo `--b-x` e `--b-x-md`, a
 * folha `funnel.css` faz a troca no breakpoint — sem CSS-in-JS, sem hidratação
 * extra, e o SSR já sai com o visual final.
 */
export function blockStyleVars(style?: StyleOverride): CSSProperties {
  if (!style) return {};

  const vars: Record<string, string> = {};
  const set = (name: string, value: string | undefined) => {
    if (value !== undefined) vars[name] = value;
  };

  const [align, alignMd] = splitResponsive(style.align);
  set("--b-align", align);
  set("--b-align-md", alignMd);

  const [size, sizeMd] = splitResponsive(style.fontSize);
  set("--b-size", resolveFontSize(size));
  set("--b-size-md", resolveFontSize(sizeMd));

  const [hidden, hiddenMd] = splitResponsive(style.hidden);
  if (hidden !== undefined) set("--b-display", hidden ? "none" : "block");
  if (hiddenMd !== undefined) set("--b-display-md", hiddenMd ? "none" : "block");

  set("--b-color", resolveColor(style.textColor));
  set("--b-bg", resolveColor(style.bgColor));
  set("--b-weight", style.fontWeight ? String(style.fontWeight) : undefined);
  set("--b-lh", style.lineHeight ? String(style.lineHeight) : undefined);
  set("--b-ls", style.letterSpacing !== undefined ? `${style.letterSpacing / 100}em` : undefined);

  set("--b-mt", resolveSpace(style.marginTop));
  set("--b-mb", resolveSpace(style.marginBottom));
  set("--b-px", resolveSpace(style.paddingX));
  set("--b-py", resolveSpace(style.paddingY));

  set("--b-radius", resolveRadius(style.radius));
  set("--b-bc", resolveColor(style.borderColor));
  set("--b-bw", style.borderWidth !== undefined ? `${style.borderWidth}px` : undefined);
  set("--b-shadow", resolveShadow(style.shadow));
  set(
    "--b-maxw",
    style.maxWidth === undefined
      ? undefined
      : style.maxWidth === "full"
        ? "100%"
        : `${style.maxWidth}px`,
  );

  return vars as CSSProperties;
}

/** `{ base, md }` ou valor solto → par `[base, md]`. */
export function splitResponsive<T>(
  value: Responsive<T> | undefined,
): [T | undefined, T | undefined] {
  if (value === undefined) return [undefined, undefined];

  if (typeof value === "object" && value !== null && "base" in (value as object)) {
    const responsive = value as { base: T; md?: T };
    return [responsive.base, responsive.md];
  }

  return [value as T, undefined];
}

/** Vars da animação de entrada; a folha de estilo cuida do keyframe. */
export function blockAnimationVars(animation?: {
  preset: string;
  delay: number;
  duration: number;
}): CSSProperties {
  if (!animation || animation.preset === "none") return {};

  return {
    "--b-anim-delay": `${animation.delay}ms`,
    "--b-anim-duration": `${animation.duration}ms`,
  } as CSSProperties;
}

const aspectRatios: Record<string, string> = {
  "1:1": "1 / 1",
  "4:3": "4 / 3",
  "16:9": "16 / 9",
  "3:4": "3 / 4",
  "9:16": "9 / 16",
};

export function resolveAspect(aspect: string): string | undefined {
  return aspect === "auto" ? undefined : aspectRatios[aspect];
}
