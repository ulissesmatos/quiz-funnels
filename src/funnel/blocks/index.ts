import { buttonBlock, loaderBlock, resultBlock } from "./definitions/action";
import {
  dividerBlock,
  headingBlock,
  listBlock,
  progressBlock,
  spacerBlock,
  textBlock,
} from "./definitions/content";
import { choiceBlock, inputBlock } from "./definitions/input";
import { imageBlock, videoBlock } from "./definitions/media";

export { createContainerBlock } from "./definitions/container";
export * from "./types";

/**
 * Todos os blocos que NÃO contêm outros blocos.
 *
 * Esta lista é o registro central: o editor monta a paleta a partir dela, o
 * schema monta a união discriminada, e o copiloto de IA aprende o vocabulário
 * de blocos aqui. Adicionar um bloco = criar a definição e incluir nesta lista.
 */
export const leafBlockDefinitions = [
  headingBlock,
  textBlock,
  listBlock,
  imageBlock,
  videoBlock,
  choiceBlock,
  inputBlock,
  buttonBlock,
  loaderBlock,
  resultBlock,
  progressBlock,
  dividerBlock,
  spacerBlock,
] as const;

export type LeafBlockDefinition = (typeof leafBlockDefinitions)[number];
export type LeafBlockType = LeafBlockDefinition["type"];

export const leafBlockTypes = leafBlockDefinitions.map((d) => d.type) as LeafBlockType[];
