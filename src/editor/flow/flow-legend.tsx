"use client";

import { X } from "lucide-react";

/**
 * Explica os três estilos de aresta do mapa — a parte do fluxo que mais
 * depende de já saber ler o desenho.
 */
export function FlowLegend({ aberta, onFechar }: { aberta: boolean; onFechar: () => void }) {
  if (!aberta) return null;

  return (
    <div className="fl-paineleto" role="note">
      <div className="fl-paineleto-cabecalho">
        <span>Como ler o mapa</span>
        <button type="button" className="fl-paineleto-fechar" aria-label="Fechar legenda" onClick={onFechar}>
          <X size={13} />
        </button>
      </div>

      <div className="fl-legenda-item">
        <span className="fl-legenda-amostra fl-legenda-amostra--padrao" />
        Ordem normal das telas — segue se nenhuma regra bater
      </div>

      <div className="fl-legenda-item">
        <span className="fl-legenda-amostra fl-legenda-amostra--regra" />
        Regra — só segue quando a condição é verdadeira; a cor identifica de
        qual card as setas saem
      </div>

      <div className="fl-legenda-item">
        <span className="fl-legenda-amostra fl-legenda-amostra--botao" />
        Botão ou oferta que pula direto para outra tela
      </div>
    </div>
  );
}
