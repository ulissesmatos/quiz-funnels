"use client";

import { X } from "lucide-react";
import { useMemo } from "react";

import { camposDisponiveis } from "../condition-fields";
import { useDocument } from "../editor-context";

/**
 * Referência de todas as keys de campo do funil — respostas, pontuação e
 * variáveis — com a tela que define cada uma.
 *
 * Fecha a confusão de "qual é a key desse campo mesmo?" sem precisar abrir o
 * editor de regra só para espiar o seletor.
 */
export function FieldsPanel({ aberto, onFechar }: { aberto: boolean; onFechar: () => void }) {
  const doc = useDocument();
  const campos = useMemo(() => camposDisponiveis(doc), [doc]);

  if (!aberto) return null;

  const respostas = campos.filter((c) => c.source === "answer");
  const pontuacao = campos.filter((c) => c.source === "score");
  const variaveis = campos.filter((c) => c.source === "variable");

  return (
    <div className="fl-paineleto" role="note">
      <div className="fl-paineleto-cabecalho">
        <span>Campos do funil</span>
        <button type="button" className="fl-paineleto-fechar" aria-label="Fechar painel de campos" onClick={onFechar}>
          <X size={13} />
        </button>
      </div>

      {campos.length === 0 && <p className="fl-popover-vazio">Nenhum campo ainda.</p>}

      {respostas.length > 0 && (
        <div className="fl-campos-secao">
          <p className="fl-campos-secao-titulo">Respostas</p>
          {respostas.map((campo) => (
            <div key={`answer:${campo.key}`} className="fl-campo-item">
              <div className="fl-campo-item-topo">
                <code>{campo.key}</code>
                <span className="fl-campo-item-tela">{campo.definidoEmStepNome}</span>
              </div>
              {campo.opcoes.length > 0 && (
                <p className="fl-campo-item-opcoes">{campo.opcoes.map((o) => o.label).join(" · ")}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {pontuacao.length > 0 && (
        <div className="fl-campos-secao">
          <p className="fl-campos-secao-titulo">Pontuação</p>
          {pontuacao.map((campo) => (
            <div key={`score:${campo.key ?? "total"}`} className="fl-campo-item">
              <code>{campo.key ?? "total"}</code>
            </div>
          ))}
        </div>
      )}

      {variaveis.length > 0 && (
        <div className="fl-campos-secao">
          <p className="fl-campos-secao-titulo">Variáveis</p>
          {variaveis.map((campo) => (
            <div key={`variable:${campo.key}`} className="fl-campo-item">
              <code>{campo.key}</code>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
