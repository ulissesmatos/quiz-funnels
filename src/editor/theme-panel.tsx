"use client";

import type { Theme } from "@/funnel/schema/theme";
import { coresDoPreset, THEME_PRESETS } from "@/funnel/theme/presets";
import { cn } from "@/lib/cn";

import { useDocument, useEditor } from "./editor-context";

const MODOS: { valor: Theme["mode"]; rotulo: string; dica: string }[] = [
  { valor: "dark", rotulo: "Escuro", dica: "Fundo escuro, alto contraste" },
  { valor: "light", rotulo: "Claro", dica: "Fundo claro" },
  { valor: "auto", rotulo: "Automático", dica: "Segue o sistema de quem visita" },
];

const CORES: { chave: keyof Theme["colors"]; rotulo: string; dica: string }[] = [
  { chave: "bg", rotulo: "Fundo", dica: "Fundo da página" },
  { chave: "surface", rotulo: "Superfície", dica: "Cards, opções e caixas" },
  { chave: "text", rotulo: "Texto", dica: "Cor principal do texto" },
  { chave: "muted", rotulo: "Texto secundário", dica: "Legendas e apoio" },
  { chave: "primary", rotulo: "Primária", dica: "Botões e seleção" },
  { chave: "primaryFg", rotulo: "Sobre a primária", dica: "Texto dentro do botão" },
  { chave: "accent", rotulo: "Destaque", dica: "Badges e realces" },
  { chave: "border", rotulo: "Borda", dica: "Bordas e divisores" },
];

const FONTES = [
  "Inter",
  "Poppins",
  "Montserrat",
  "Rubik",
  "Manrope",
  "DM Sans",
  "Plus Jakarta Sans",
  "Nunito",
  "Playfair Display",
  "Sora",
];

export function ThemePanel() {
  const doc = useDocument();
  const dispatch = useEditor((s) => s.dispatch);
  const theme = doc.theme;

  /**
   * Modo e preset são independentes, mas `colors` continua sendo a paleta já
   * resolvida (o que de fato renderiza) — trocar qualquer um dos dois
   * recalcula `colors` a partir do preset atual. No automático a base gravada
   * é a escura; quem decide claro/escuro de verdade é o navegador de quem
   * visita (ver `useEffectiveTheme`), isso aqui é só o valor de reserva.
   */
  function aplicarModo(modo: Theme["mode"]) {
    const corDeBase = modo === "light" ? "light" : "dark";
    dispatch(
      { type: "set_theme", patch: { mode: modo, colors: coresDoPreset(theme.presetId, corDeBase) } },
      { label: "Alterar modo do tema" },
    );
  }

  function aplicarPreset(presetId: string) {
    const corDeBase = theme.mode === "light" ? "light" : "dark";
    dispatch(
      { type: "set_theme", patch: { presetId, colors: coresDoPreset(presetId, corDeBase) } },
      { label: "Alterar preset de cor" },
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-2">
        <h3 className="text-xs font-medium tracking-wide text-app-muted uppercase">Modo</h3>
        <div className="grid grid-cols-3 gap-2">
          {MODOS.map(({ valor, rotulo, dica }) => (
            <button
              key={valor}
              type="button"
              title={dica}
              className={cn(
                "rounded-lg border px-2 py-2 text-sm transition-colors",
                theme.mode === valor
                  ? "border-app-primary text-app-text"
                  : "border-app-border text-app-muted hover:border-app-primary/60 hover:text-app-text",
              )}
              onClick={() => aplicarModo(valor)}
            >
              {rotulo}
            </button>
          ))}
        </div>
        {theme.mode === "auto" && (
          <p className="text-[11px] text-app-muted">
            O funil publicado troca sozinho entre a versão clara e a escura deste preset, conforme
            o sistema de quem visita.
          </p>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-xs font-medium tracking-wide text-app-muted uppercase">Presets</h3>
        <div className="grid grid-cols-3 gap-2">
          {THEME_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-lg border px-2 py-2.5 text-xs transition-colors",
                theme.presetId === preset.id
                  ? "border-app-primary text-app-text"
                  : "border-app-border text-app-muted hover:border-app-primary/60 hover:text-app-text",
              )}
              onClick={() => aplicarPreset(preset.id)}
            >
              <span
                className="h-5 w-5 rounded-full border border-white/10"
                style={{ background: preset.swatch }}
              />
              {preset.label}
            </button>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-2.5">
        <h3 className="text-xs font-medium tracking-wide text-app-muted uppercase">Cores</h3>
        {CORES.map(({ chave, rotulo, dica }) => (
          <div key={chave} className="flex items-center gap-2.5">
            <input
              type="color"
              aria-label={rotulo}
              className="h-8 w-10 shrink-0 cursor-pointer rounded border border-app-border bg-transparent"
              value={theme.colors[chave]}
              onChange={(e) =>
                dispatch(
                  { type: "set_theme", patch: { colors: { [chave]: e.target.value } } },
                  { label: `Cor ${rotulo}`, mergeKey: `theme.colors.${chave}` },
                )
              }
            />
            <div className="min-w-0">
              <p className="text-sm">{rotulo}</p>
              <p className="text-[11px] text-app-muted">{dica}</p>
            </div>
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-2.5">
        <h3 className="text-xs font-medium tracking-wide text-app-muted uppercase">Tipografia</h3>

        <label className="flex flex-col gap-1">
          <span className="text-sm">Fonte dos títulos</span>
          <select
            className="ed-control"
            value={theme.typography.heading.family}
            onChange={(e) =>
              dispatch({
                type: "set_theme",
                patch: {
                  typography: {
                    ...theme.typography,
                    heading: { ...theme.typography.heading, family: e.target.value },
                  },
                },
              })
            }
          >
            {FONTES.map((fonte) => (
              <option key={fonte} value={fonte}>
                {fonte}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm">Fonte do texto</span>
          <select
            className="ed-control"
            value={theme.typography.body.family}
            onChange={(e) =>
              dispatch({
                type: "set_theme",
                patch: {
                  typography: {
                    ...theme.typography,
                    body: { ...theme.typography.body, family: e.target.value },
                  },
                },
              })
            }
          >
            {FONTES.map((fonte) => (
              <option key={fonte} value={fonte}>
                {fonte}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm">
            Escala dos textos · {theme.typography.scale.toFixed(2)}×
          </span>
          <input
            type="range"
            min={0.8}
            max={1.3}
            step={0.05}
            className="accent-[var(--color-app-primary)]"
            value={theme.typography.scale}
            onChange={(e) =>
              dispatch(
                {
                  type: "set_theme",
                  patch: { typography: { ...theme.typography, scale: Number(e.target.value) } },
                },
                { mergeKey: "theme.scale" },
              )
            }
          />
        </label>
      </section>

      <section className="flex flex-col gap-2.5">
        <h3 className="text-xs font-medium tracking-wide text-app-muted uppercase">Botões</h3>

        <label className="flex flex-col gap-1">
          <span className="text-sm">Estilo</span>
          <select
            className="ed-control"
            value={theme.button.variant}
            onChange={(e) =>
              dispatch({
                type: "set_theme",
                patch: { button: { variant: e.target.value as Theme["button"]["variant"] } },
              })
            }
          >
            <option value="solid">Preenchido</option>
            <option value="outline">Contornado</option>
            <option value="soft">Suave</option>
            <option value="ghost">Sem fundo</option>
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm">Cantos</span>
          <select
            className="ed-control"
            value={theme.button.radius}
            onChange={(e) =>
              dispatch({
                type: "set_theme",
                patch: { button: { radius: e.target.value as Theme["button"]["radius"] } },
              })
            }
          >
            <option value="none">Retos</option>
            <option value="sm">Levemente arredondados</option>
            <option value="md">Arredondados</option>
            <option value="lg">Bem arredondados</option>
            <option value="full">Pílula</option>
          </select>
        </label>

        <label className="flex items-center gap-2.5">
          <input
            type="checkbox"
            className="h-4 w-4 accent-[var(--color-app-primary)]"
            checked={theme.button.fullWidth}
            onChange={(e) =>
              dispatch({ type: "set_theme", patch: { button: { fullWidth: e.target.checked } } })
            }
          />
          <span className="text-sm">Ocupar a largura toda</span>
        </label>
      </section>

      <section className="flex flex-col gap-2.5">
        <h3 className="text-xs font-medium tracking-wide text-app-muted uppercase">Layout</h3>

        <label className="flex flex-col gap-1">
          <span className="text-sm">Largura do conteúdo · {theme.contentWidth}px</span>
          <input
            type="range"
            min={320}
            max={900}
            step={20}
            className="accent-[var(--color-app-primary)]"
            value={theme.contentWidth}
            onChange={(e) =>
              dispatch(
                { type: "set_theme", patch: { contentWidth: Number(e.target.value) } },
                { mergeKey: "theme.contentWidth" },
              )
            }
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm">Transição entre telas</span>
          <select
            className="ed-control"
            value={theme.transition}
            onChange={(e) =>
              dispatch({
                type: "set_theme",
                patch: { transition: e.target.value as Theme["transition"] },
              })
            }
          >
            <option value="fade">Suave</option>
            <option value="slide">Deslizar</option>
            <option value="slide_up">Subir</option>
            <option value="none">Sem transição</option>
          </select>
        </label>
      </section>
    </div>
  );
}
