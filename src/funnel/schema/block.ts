import { z } from "zod";

import {
  createContainerBlock,
  leafBlockDefinitions,
  type AnyBlockDefinition,
  type LeafBlockDefinition,
} from "../blocks";
import { BlockAnimation, Condition, SlugId, StyleOverride } from "./common";

/**
 * Envelope comum a todo bloco. As props ficam em `props` (específicas do tipo)
 * e tudo o que é transversal — estilo, visibilidade condicional, animação —
 * fica ao lado, sempre com o mesmo nome. Assim a IA aprende uma vez e aplica
 * a qualquer bloco.
 */
function envelope(def: { type: string; props: z.ZodType }) {
  return z
    .object({
      id: SlugId.describe("Identificador legível e estável, ex.: 'blk_titulo_principal'"),
      type: z.literal(def.type),
      props: def.props,
      style: StyleOverride.optional().describe("Ajustes visuais sobre o tema"),
      visibleIf: Condition.optional().describe("Se presente, o bloco só aparece quando a condição é verdadeira"),
      animation: BlockAnimation.optional(),
    })
    .strict();
}

type AnyObject = z.ZodObject<z.ZodRawShape>;
type UnionMembers = [AnyObject, AnyObject, ...AnyObject[]];

const leafEnvelopes = leafBlockDefinitions.map((def) => envelope(def)) as unknown as UnionMembers;

/** Blocos que podem viver dentro de um container. */
export const LeafBlock = z.discriminatedUnion("type", leafEnvelopes);

export const containerBlockDefinition = createContainerBlock(LeafBlock);

const containerEnvelope = envelope(containerBlockDefinition);

/** Qualquer bloco, incluindo o container. */
export const Block = z.discriminatedUnion("type", [
  ...leafEnvelopes,
  containerEnvelope,
] as unknown as UnionMembers);

// ── Tipos ──────────────────────────────────────────────────────
// Derivados das definições, não de `z.infer` da união: assim cada `type` fica
// ligado ao formato exato das suas props, e o TypeScript estreita corretamente
// num `switch (block.type)`.

type Envelope<TType extends string, TProps> = {
  id: string;
  type: TType;
  props: TProps;
  style?: StyleOverride;
  visibleIf?: Condition;
  animation?: BlockAnimation;
};

export type LeafBlock = {
  [D in LeafBlockDefinition as D["type"]]: Envelope<D["type"], z.infer<D["props"]>>;
}[LeafBlockDefinition["type"]];

export type ContainerBlock = Envelope<
  "container",
  {
    columns: 1 | 2 | 3 | { base: 1 | 2 | 3; md?: 1 | 2 | 3 };
    gap: number;
    children: LeafBlock[];
  }
>;

export type Block = LeafBlock | ContainerBlock;
export type BlockType = Block["type"];

/** Extrai o tipo das props de um bloco específico: `PropsOf<"choice">`. */
export type PropsOf<T extends BlockType> = Extract<Block, { type: T }>["props"];

// ── Registro consultável ───────────────────────────────────────

/** Todas as definições, inclusive o container. */
export const allBlockDefinitions: AnyBlockDefinition[] = [
  ...leafBlockDefinitions,
  containerBlockDefinition,
];

/** Indexado por tipo, para lookup no editor e nas tools da IA. */
export const blockRegistry = Object.fromEntries(
  allBlockDefinitions.map((def) => [def.type, def]),
) as Record<BlockType, AnyBlockDefinition>;

export function getBlockDefinition(type: string): AnyBlockDefinition | undefined {
  return blockRegistry[type as BlockType];
}

export function isContainer(block: Block): block is ContainerBlock {
  return block.type === "container";
}

/** Percorre blocos e os filhos de containers, em ordem de leitura. */
export function* walkBlocks(blocks: Block[]): Generator<Block> {
  for (const block of blocks) {
    yield block;
    if (isContainer(block)) {
      for (const child of block.props.children) yield child;
    }
  }
}
