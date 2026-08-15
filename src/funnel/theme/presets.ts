import { defaultTheme, lightTheme, type ThemeColors } from "../schema/theme";

/**
 * Um preset é uma identidade de cor com duas paletas — clara e escura —, não
 * uma paleta só. É o que permite separar "qual preset" de "claro ou escuro":
 * trocar o modo troca só qual das duas entra em `theme.colors`, sem mexer em
 * mais nada.
 */
export type ThemePreset = {
  id: string;
  label: string;
  /** Cor de amostra pro seletor — a `primary` do escuro, que é a mais viva. */
  swatch: string;
  dark: ThemeColors;
  light: ThemeColors;
};

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: "roxo",
    label: "Roxo",
    swatch: defaultTheme.colors.primary,
    dark: defaultTheme.colors,
    light: lightTheme.colors,
  },
  {
    id: "oceano",
    label: "Oceano",
    swatch: "#2f8fef",
    dark: {
      bg: "#0a0f1a",
      surface: "#111a2c",
      text: "#eef3fb",
      muted: "#8fa0bd",
      primary: "#2f8fef",
      primaryFg: "#ffffff",
      accent: "#22c1d6",
      border: "#1c2942",
      success: "#22c55e",
      danger: "#ef4444",
    },
    light: {
      bg: "#ffffff",
      surface: "#eef4fc",
      text: "#0f1b2d",
      muted: "#5b7290",
      primary: "#1c6fd6",
      primaryFg: "#ffffff",
      accent: "#0f9cb3",
      border: "#dbe6f3",
      success: "#16a34a",
      danger: "#dc2626",
    },
  },
  {
    id: "esmeralda",
    label: "Esmeralda",
    swatch: "#22c55e",
    dark: {
      bg: "#0a140f",
      surface: "#0f1f18",
      text: "#eefaf3",
      muted: "#8fb3a1",
      primary: "#1fb463",
      primaryFg: "#ffffff",
      accent: "#a3e635",
      border: "#17301f",
      success: "#22c55e",
      danger: "#ef4444",
    },
    light: {
      bg: "#ffffff",
      surface: "#eef8f1",
      text: "#0e1a14",
      muted: "#547a63",
      primary: "#0e9450",
      primaryFg: "#ffffff",
      accent: "#65a30d",
      border: "#d8ecdf",
      success: "#16a34a",
      danger: "#dc2626",
    },
  },
  {
    id: "ambar",
    label: "Âmbar",
    swatch: "#f0930b",
    dark: {
      bg: "#160f08",
      surface: "#241a0d",
      text: "#fbf3e8",
      muted: "#c2a883",
      primary: "#f0930b",
      primaryFg: "#1a1206",
      accent: "#f5c542",
      border: "#382812",
      success: "#22c55e",
      danger: "#ef4444",
    },
    light: {
      bg: "#fffdf8",
      surface: "#faf1de",
      text: "#20160a",
      muted: "#8a6f45",
      primary: "#d97c06",
      primaryFg: "#ffffff",
      accent: "#b8860b",
      border: "#f0e2c4",
      success: "#16a34a",
      danger: "#dc2626",
    },
  },
  {
    id: "rosa",
    label: "Rosa",
    swatch: "#e83f95",
    dark: {
      bg: "#160a12",
      surface: "#241120",
      text: "#fbeaf3",
      muted: "#c491ab",
      primary: "#e83f95",
      primaryFg: "#ffffff",
      accent: "#f97316",
      border: "#331a2b",
      success: "#22c55e",
      danger: "#ef4444",
    },
    light: {
      bg: "#fffafc",
      surface: "#fbeaf3",
      text: "#22111c",
      muted: "#8a5872",
      primary: "#d21f79",
      primaryFg: "#ffffff",
      accent: "#ea580c",
      border: "#f5d9e6",
      success: "#16a34a",
      danger: "#dc2626",
    },
  },
];

export function encontrarPreset(id: string): ThemePreset {
  return THEME_PRESETS.find((p) => p.id === id) ?? THEME_PRESETS[0]!;
}

/** Paleta do preset pro modo dado — `auto` resolve pra escuro no servidor. */
export function coresDoPreset(id: string, mode: "light" | "dark" | "auto"): ThemeColors {
  const preset = encontrarPreset(id);
  return mode === "light" ? preset.light : preset.dark;
}
