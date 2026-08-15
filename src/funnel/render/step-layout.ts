import type { Block } from "../schema/block";

/**
 * Separa os blocos que ficam presos ao topo da tela dos que seguem o fluxo.
 *
 * Hoje só a barra de progresso com `sticky` se comporta assim. O motivo de
 * isolá-los em vez de posicioná-los por CSS absoluto: numa tela centralizada
 * verticalmente e de altura curta, o conteúdo subiria por baixo da barra. Como
 * cabeçalho de verdade, o espaço é reservado sozinho — e vale igual no funil
 * publicado e no preview do editor.
 */
export function separarBlocosFixos(blocks: Block[]): { fixos: Block[]; fluxo: Block[] } {
  const fixos: Block[] = [];
  const fluxo: Block[] = [];

  for (const block of blocks) {
    if (block.type === "progress" && block.props.sticky) fixos.push(block);
    else fluxo.push(block);
  }

  return { fixos, fluxo };
}
