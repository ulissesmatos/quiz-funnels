import { z } from "zod";

/**
 * O tema é a única fonte de aparência do funil público. Ele vira CSS variables
 * (`--fn-color-primary`, `--fn-radius-md`, …) no elemento raiz, e todo bloco
 * consome variável em vez de valor literal. Trocar o tema repinta tudo.
 */

const Hex = z
  .string()
  .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/, "Use hexadecimal, ex.: #1a1a2e");

export const ThemeColors = z
  .object({
    bg: Hex.describe("Fundo da página"),
    surface: Hex.describe("Fundo de cards, opções e caixas"),
    text: Hex.describe("Cor de texto principal"),
    muted: Hex.describe("Texto secundário, legendas, placeholders"),
    primary: Hex.describe("Cor da marca: botões, barra de progresso, opção selecionada"),
    primaryFg: Hex.describe("Cor do texto sobre a cor primária"),
    accent: Hex.describe("Destaque secundário: badges, ícones, realces"),
    border: Hex.describe("Bordas e divisores"),
    success: Hex,
    danger: Hex,
    /**
     * Cor de aviso. Opcional porque nasceu depois de já haver funil salvo; sem
     * ela o render usa um âmbar padrão. Existe separada de `accent` de
     * propósito: um alerta de atenção pintado com a cor da marca pode sair
     * verde, e aí ele deixa de comunicar o que deveria.
     */
    warning: Hex.optional(),
  })
  .strict();

export const ThemeFont = z
  .object({
    family: z
      .string()
      .min(1)
      .describe("Nome da família, ex.: 'Inter'. Fontes do Google são carregadas automaticamente."),
    weight: z.number().min(100).max(900).default(400),
    /** URL de @font-face para fontes que não estão no Google Fonts. */
    url: z.string().url().optional(),
  })
  .strict();

export const ThemeTypography = z
  .object({
    heading: ThemeFont,
    body: ThemeFont,
    /** Multiplica toda a escala de tamanhos. 1 = padrão. */
    scale: z.number().min(0.75).max(1.5).default(1),
  })
  .strict();

export const ThemeRadius = z
  .object({
    sm: z.number().min(0).max(64).default(6),
    md: z.number().min(0).max(64).default(12),
    lg: z.number().min(0).max(64).default(20),
    xl: z.number().min(0).max(64).default(28),
  })
  .strict();

export const ThemeSpacing = z
  .object({
    xs: z.number().min(0).default(4),
    sm: z.number().min(0).default(8),
    md: z.number().min(0).default(16),
    lg: z.number().min(0).default(24),
    xl: z.number().min(0).default(40),
    "2xl": z.number().min(0).default(64),
  })
  .strict();

export const ThemeButton = z
  .object({
    variant: z.enum(["solid", "outline", "soft", "ghost"]).default("solid"),
    radius: z.enum(["none", "sm", "md", "lg", "xl", "full"]).default("lg"),
    size: z.enum(["sm", "md", "lg"]).default("lg"),
    fullWidth: z.boolean().default(true).describe("Botão ocupando a largura toda — padrão em funis mobile"),
    shadow: z.enum(["none", "sm", "md", "lg"]).default("md"),
    uppercase: z.boolean().default(false),
  })
  .strict();

export const StepTransition = z.enum(["none", "fade", "slide", "slide_up"]);

export const Theme = z
  .object({
    colors: ThemeColors,
    typography: ThemeTypography,
    radius: ThemeRadius,
    spacing: ThemeSpacing,
    button: ThemeButton,
    /** Largura máxima do conteúdo em px. Funis convertem melhor estreitos. */
    contentWidth: z.number().min(280).max(1400).default(560),
    transition: StepTransition.default("fade"),
  })
  .strict();

export type Theme = z.infer<typeof Theme>;
export type ThemeColors = z.infer<typeof ThemeColors>;

/** Tema padrão: escuro, alto contraste — o visual mais comum em funis de alta conversão. */
export const defaultTheme: Theme = {
  colors: {
    bg: "#0e0f1a",
    surface: "#1a1c2e",
    text: "#f5f6fa",
    muted: "#9aa0b5",
    primary: "#6c4bf6",
    primaryFg: "#ffffff",
    accent: "#22d3a7",
    border: "#2a2d45",
    success: "#22c55e",
    danger: "#ef4444",
  },
  typography: {
    heading: { family: "Inter", weight: 700 },
    body: { family: "Inter", weight: 400 },
    scale: 1,
  },
  radius: { sm: 6, md: 12, lg: 20, xl: 28 },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 40, "2xl": 64 },
  button: {
    variant: "solid",
    radius: "lg",
    size: "lg",
    fullWidth: true,
    shadow: "md",
    uppercase: false,
  },
  contentWidth: 560,
  transition: "fade",
};

/** Variante clara, oferecida como preset no editor. */
export const lightTheme: Theme = {
  ...defaultTheme,
  colors: {
    bg: "#ffffff",
    surface: "#f6f7fb",
    text: "#12131a",
    muted: "#6b7280",
    primary: "#5b34f0",
    primaryFg: "#ffffff",
    accent: "#0ea67d",
    border: "#e5e7eb",
    success: "#16a34a",
    danger: "#dc2626",
  },
};
