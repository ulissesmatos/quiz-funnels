import { z } from "zod";

import { responsive } from "../../schema/common";
import { defineBlock } from "../types";

/**
 * O container é o único bloco que contém outros — e aceita **apenas um nível**
 * de aninhamento (nada de container dentro de container). Essa restrição é
 * deliberada: ela mantém o editor simples, o render previsível e impede a IA de
 * produzir estruturas em boneca-russa que ninguém consegue editar depois.
 *
 * Por depender do schema dos demais blocos, a definição é criada por uma função
 * chamada em `schema/block.ts`, depois que a união das folhas já existe.
 */
export function createContainerBlock<TLeaf extends z.ZodTypeAny>(leafBlock: TLeaf) {
  return defineBlock({
    type: "container",
    label: "Colunas",
    category: "layout",
    icon: "Columns2",
    description:
      "Agrupa blocos em colunas no desktop. No celular as colunas sempre viram uma pilha vertical, então o layout nunca quebra. Use para pôr imagem ao lado de texto, ou dois cards lado a lado. Não pode conter outro container.",
    props: z
      .object({
        columns: responsive(z.union([z.literal(1), z.literal(2), z.literal(3)])).describe(
          "Número de colunas. Use { base: 1, md: 2 } para empilhar no celular e dividir no desktop.",
        ),
        gap: z.number().min(0).max(80).describe("Espaço entre as colunas, em pixels"),
        children: z.array(leafBlock).max(24).describe("Blocos distribuídos pelas colunas, na ordem"),
      })
      .strict(),
    defaults: { columns: { base: 1, md: 2 }, gap: 16, children: [] },
    example: { columns: { base: 1, md: 2 }, gap: 24, children: [] },
  });
}
