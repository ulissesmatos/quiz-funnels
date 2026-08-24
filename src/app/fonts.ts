import { Fraunces, Instrument_Sans, JetBrains_Mono } from "next/font/google";

/** UI e corpo — em tudo, o tempo todo. */
export const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-instrument-sans",
  display: "swap",
});

/**
 * Serif editorial — só em momentos de baixa densidade (hero da landing,
 * títulos de empty-state). Nunca em UI densa: mistura serif+sans em display
 * é o que dá o toque de "feito por designer" sem comprometer legibilidade
 * onde a tela já está cheia de informação.
 */
export const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

/** Números de KPI (com `tabular-nums`) e chips de código/ID técnico. */
export const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});
