import { z } from "zod";

import { MediaImage, VariableKey } from "../../schema/common";
import { defineBlock } from "../types";

const ChoiceOption = z
  .object({
    id: VariableKey.describe("Identificador estável da opção, ex.: 'perder_peso'. É o valor gravado na resposta."),
    label: z.string().min(1),
    description: z.string().optional().describe("Linha de apoio menor, abaixo do rótulo"),
    emoji: z.string().max(8).optional(),
    image: MediaImage.optional().describe("Usado quando layout é 'grid2' ou 'grid3'"),
    score: z.number().optional().describe("Pontos somados ao score total quando esta opção é escolhida"),
    scores: z
      .record(VariableKey, z.number())
      .optional()
      .describe(
        "Pontos por categoria, para quizzes de perfil. Ex.: { \"metabolismo_lento\": 3, \"metabolismo_rapido\": 0 }",
      ),
  })
  .strict();

export const choiceBlock = defineBlock({
  type: "choice",
  label: "Opções",
  category: "entrada",
  icon: "ListTodo",
  description:
    "Pergunta de múltipla escolha — o bloco mais importante de um quiz. Com 'multiple' desligado e 'autoAdvance' ligado, clicar na opção já avança para o próximo step: é assim que se constrói o padrão de uma pergunta por tela, o que mais converte. Use 'score' ou 'scores' nas opções para classificar o lead. Varie o 'layout' de pergunta para pergunta — usar sempre o mesmo cansa o visitante antes da metade do funil.",
  props: z
    .object({
      name: VariableKey.describe(
        "Nome da variável onde a resposta é gravada. Também é como esta resposta é referenciada em condições e em {{interpolação}}.",
      ),
      options: z.array(ChoiceOption).min(2).max(12),
      multiple: z.boolean().describe("Permite selecionar mais de uma opção"),
      layout: z
        .enum(["list", "grid2", "grid3", "emoji", "chips"])
        .describe(
          "list = uma opção por linha, com espaço para descrição (padrão em mobile); grid2/grid3 = colunas com imagem ou emoji, boas para poucas opções; emoji = grid de 2 colunas com o emoji em destaque — toda opção PRECISA de emoji nesse layout; chips = pílulas compactas lado a lado, boas para muitas opções curtas ou quando a tela já tem outro elemento visual e as opções não precisam de peso.",
        ),
      autoAdvance: z
        .boolean()
        .describe("Avança sozinho ao selecionar. Só faz sentido com multiple = false. Dispensa botão de continuar."),
      required: z.boolean(),
      minSelect: z.number().min(1).optional().describe("Mínimo de opções quando multiple = true"),
      maxSelect: z.number().min(1).optional().describe("Máximo de opções quando multiple = true"),
      showLetters: z.boolean().describe("Mostra A, B, C… antes de cada opção"),
    })
    .strict()
    .superRefine((props, ctx) => {
      if (props.layout !== "emoji") return;

      props.options.forEach((option, index) => {
        if (!option.emoji) {
          ctx.addIssue({
            code: "custom",
            path: ["options", index, "emoji"],
            message: "Layout 'emoji' exige um emoji em cada opção.",
          });
        }
      });
    }),
  defaults: {
    name: "resposta",
    options: [
      { id: "opcao_1", label: "Primeira opção" },
      { id: "opcao_2", label: "Segunda opção" },
    ],
    multiple: false,
    layout: "list",
    autoAdvance: true,
    required: true,
    showLetters: false,
  },
  example: {
    name: "objetivo",
    options: [
      { id: "perder_peso", label: "Perder peso", emoji: "🔥", scores: { emagrecimento: 3 } },
      { id: "ganhar_massa", label: "Ganhar massa muscular", emoji: "💪", scores: { hipertrofia: 3 } },
      { id: "mais_energia", label: "Ter mais energia no dia a dia", emoji: "⚡", scores: { energia: 3 } },
    ],
    multiple: false,
    layout: "list",
    autoAdvance: true,
    required: true,
    showLetters: false,
  },
  isInput: true,
});

export const inputBlock = defineBlock({
  type: "input",
  label: "Campo",
  category: "entrada",
  icon: "TextCursorInput",
  description:
    "Campo de digitação: texto, e-mail, telefone, número ou texto longo. Peça e-mail e telefone só depois que a pessoa já respondeu algumas perguntas — pedir logo na primeira tela derruba a conversão.",
  props: z
    .object({
      name: VariableKey.describe("Nome da variável onde o valor é gravado; use 'nome', 'email', 'telefone' nos campos padrão"),
      inputType: z.enum(["text", "email", "tel", "number", "textarea"]),
      label: z.string().optional().describe("Rótulo acima do campo"),
      placeholder: z.string().optional(),
      helpText: z.string().optional().describe("Texto pequeno abaixo do campo"),
      required: z.boolean(),
      minLength: z.number().min(0).optional(),
      maxLength: z.number().min(1).optional(),
      min: z.number().optional().describe("Valor mínimo quando inputType = 'number'"),
      max: z.number().optional().describe("Valor máximo quando inputType = 'number'"),
      blockDisposableEmail: z
        .boolean()
        .optional()
        .describe("Recusa domínios de e-mail descartável. Só se aplica a inputType = 'email'."),
    })
    .strict(),
  defaults: {
    name: "campo",
    inputType: "text",
    placeholder: "Digite aqui",
    required: true,
  },
  example: {
    name: "email",
    inputType: "email",
    label: "Para onde enviamos seu plano?",
    placeholder: "seu@email.com",
    required: true,
    blockDisposableEmail: true,
  },
  isInput: true,
});
