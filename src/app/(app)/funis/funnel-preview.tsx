import type { FunnelPreview as Dados } from "@/server/funnels/queries";

/**
 * Miniatura da primeira tela do funil, pintada com o tema que o cliente
 * escolheu — fundo, cor da marca, fonte e formato de botão.
 *
 * Não é o renderizador de verdade: montar `BlockView` uma vez por funil numa
 * lista de mais de cem seria caro e traria o CSS do funil pro painel. É uma
 * recriação fiel dos elementos que dominam a primeira tela, o suficiente pra
 * bater o olho e reconhecer qual funil é.
 *
 * As fontes não são carregadas aqui de propósito: `font-family` cai no
 * fallback do sistema se a fonte do funil não estiver presente. Baixar até 128
 * famílias do Google só pra desenhar miniaturas não compensa.
 */
export function FunnelPreview({ dados }: { dados: Dados }) {
  const {
    bg,
    surface,
    text,
    muted,
    primary,
    primaryFg,
    border,
    fonteTitulo,
    fonteCorpo,
    raioBotao,
    titulo,
    subtitulo,
    botao,
    temImagem,
    campos,
  } = dados;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none flex h-full w-full flex-col items-center justify-center gap-1 overflow-hidden px-6 py-4 select-none"
      style={{ background: bg, color: text }}
    >
      {temImagem && (
        <div
          className="mb-0.5 h-7 w-20 shrink-0 rounded-[4px]"
          style={{ background: surface, border: `1px solid ${border}` }}
        />
      )}

      {titulo && (
        <p
          className="line-clamp-2 text-center text-[11px] leading-[1.2] font-bold"
          style={{ fontFamily: `"${fonteTitulo}", system-ui, sans-serif` }}
        >
          {titulo}
        </p>
      )}

      {subtitulo && (
        <p
          className="line-clamp-1 max-w-[92%] text-center text-[7px] leading-tight"
          style={{ color: muted, fontFamily: `"${fonteCorpo}", system-ui, sans-serif` }}
        >
          {subtitulo}
        </p>
      )}

      {/* Texto real das opções/campos — não uma barra vazia. */}
      {campos.length > 0 && (
        <div className="mt-1 flex w-full max-w-[85%] flex-col gap-[3px]">
          {campos.map((textoDoCampo, i) => (
            <div
              key={i}
              className="w-full truncate px-2 py-[2.5px] text-center text-[7px] leading-[1.3]"
              style={{
                background: surface,
                border: `1px solid ${border}`,
                borderRadius: Math.min(raioBotao, 6),
                color: muted,
                fontFamily: `"${fonteCorpo}", system-ui, sans-serif`,
              }}
            >
              {textoDoCampo}
            </div>
          ))}
        </div>
      )}

      {botao && (
        <div
          className="mt-1 max-w-[86%] truncate px-3 py-[4px] text-[7px] font-semibold"
          style={{
            background: primary,
            color: primaryFg,
            borderRadius: Math.min(raioBotao, 10),
            fontFamily: `"${fonteCorpo}", system-ui, sans-serif`,
          }}
        >
          {botao}
        </div>
      )}

      {!titulo && !botao && campos.length === 0 && (
        <p className="text-[8px]" style={{ color: muted }}>
          Funil vazio
        </p>
      )}
    </div>
  );
}
