import { slugifyId, uniqueId } from "@/lib/slug";

import {
  lintFunnel,
  MIN_BLOCOS_TELA_OFERTA,
  MIN_PERGUNTAS_PARA_EXIGIR_PERSONALIZACAO,
  resumirIssues,
  temVariedadeDeFechamento,
} from "../logic/lint";
import { applyOp, collectAnswerNames, collectBlockIds, createStep, findBlock, type FunnelOp } from "../ops";
import { getBlockDefinition, isContainer, walkBlocks, type Block } from "../schema/block";
import type { Condition } from "../schema/common";
import type { FunnelDocument } from "../schema/funnel";
import type { Step, StepType } from "../schema/step";
import type { StepPatch, ThemePatch } from "../ops";
import type { AiCondition, AiToolName } from "./tools";

/**
 * Traduz uma chamada de ferramenta da IA em uma operação do editor.
 *
 * Este é o ponto onde a saída do modelo vira mudança de verdade — e onde ela é
 * validada. Rodar aqui, e não só no servidor, permite que o cliente aplique a
 * operação assim que a chamada fecha, com o canvas atualizando durante a
 * resposta em vez de só no fim.
 *
 * Nunca lança: um erro vira `{ ok: false, error }`, que volta ao modelo como
 * resultado da ferramenta para ele corrigir na chamada seguinte.
 */
export type AplicacaoResultado =
  | { ok: true; doc: FunnelDocument; resumo: string; blocosTocados: string[] }
  | { ok: false; error: string };

export function aplicarChamadaDaIa(
  doc: FunnelDocument,
  nome: AiToolName,
  entrada: Record<string, unknown>,
): AplicacaoResultado {
  try {
    switch (nome) {
      case "add_step": {
        const { name, type, afterStepId, id } = entrada as {
          name: string;
          type: Step["type"];
          afterStepId?: string;
          id?: string;
        };

        if (afterStepId && !doc.steps.some((s) => s.id === afterStepId)) {
          return { ok: false, error: `A tela "${afterStepId}" não existe.` };
        }

        const step = createStep(doc, type, name);
        if (id) step.id = id;

        return concluir(doc, { type: "add_step", step, afterStepId }, `Tela "${name}" criada`, []);
      }

      case "update_step": {
        const { stepId, name, type, align, fullHeight, isEnd, next } = entrada as {
          stepId: string;
          name?: string;
          type?: Step["type"];
          align?: "left" | "center";
          fullHeight?: boolean;
          isEnd?: boolean;
          next?: string;
        };

        const step = doc.steps.find((s) => s.id === stepId);
        if (!step) return { ok: false, error: `A tela "${stepId}" não existe.` };

        if (next !== undefined && !doc.steps.some((s) => s.id === next)) {
          return { ok: false, error: `A tela de destino "${next}" não existe.` };
        }

        const mudancas: StepPatch = {};

        if (name !== undefined) mudancas.name = name;
        if (type !== undefined) mudancas.type = type;
        if (isEnd !== undefined || next !== undefined) {
          mudancas.logic = {
            ...step.logic,
            ...(isEnd !== undefined ? { isEnd } : {}),
            ...(next !== undefined ? { next } : {}),
          };
        }
        if (align !== undefined || fullHeight !== undefined) {
          mudancas.layout = {
            ...step.layout,
            ...(align !== undefined ? { align } : {}),
            ...(fullHeight !== undefined ? { fullHeight } : {}),
          };
        }

        return concluir(
          doc,
          { type: "update_step", stepId, patch: mudancas },
          `Tela "${step.name}" atualizada`,
          [],
        );
      }

      case "remove_step": {
        const { stepId } = entrada as { stepId: string };
        if (!doc.steps.some((s) => s.id === stepId)) {
          return { ok: false, error: `A tela "${stepId}" não existe.` };
        }
        if (doc.steps.length <= 1) {
          return { ok: false, error: "O funil precisa ter pelo menos uma tela." };
        }

        return concluir(doc, { type: "remove_step", stepId }, `Tela "${stepId}" removida`, []);
      }

      case "move_step": {
        const { stepId, afterStepId } = entrada as { stepId: string; afterStepId: string | null };

        const atual = doc.steps.findIndex((s) => s.id === stepId);
        if (atual === -1) return { ok: false, error: `A tela "${stepId}" não existe.` };

        let destino = 0;

        if (afterStepId !== null) {
          const referencia = doc.steps.findIndex((s) => s.id === afterStepId);
          if (referencia === -1) {
            return { ok: false, error: `A tela de referência "${afterStepId}" não existe.` };
          }

          // Tirar a tela da lista desloca em um tudo o que vinha depois dela.
          destino = referencia < atual ? referencia + 1 : referencia;
        }

        if (destino === atual) {
          return { ok: false, error: "A tela já está nessa posição." };
        }

        return concluir(
          doc,
          { type: "move_step", stepId, toIndex: destino },
          `Tela "${doc.steps[atual].name}" movida`,
          [],
        );
      }

      case "add_block": {
        const { stepId, type, props, index, id } = entrada as {
          stepId: string;
          type: string;
          props: Record<string, unknown>;
          index?: number;
          id?: string;
        };

        const step = doc.steps.find((s) => s.id === stepId);
        if (!step) return { ok: false, error: `A tela "${stepId}" não existe.` };

        const definition = getBlockDefinition(type);
        if (!definition) {
          return { ok: false, error: `Não existe bloco do tipo "${type}".` };
        }

        const validacao = definition.props.safeParse(props);
        if (!validacao.success) {
          return { ok: false, error: descreverErro(type, validacao.error.issues) };
        }

        const blockId = escolherId(doc, id ?? `blk_${slugifyId(type)}`);
        const block = { id: blockId, type, props: validacao.data } as Block;

        garantirNomeUnicoDeCampo(doc, block);
        garantirBlocosUnicosDoContainer(doc, block);

        return concluir(
          doc,
          { type: "add_block", stepId, block, index },
          `Bloco ${type} adicionado em "${step.name}"`,
          [blockId],
        );
      }

      case "update_block": {
        const { blockId, props } = entrada as { blockId: string; props: Record<string, unknown> };

        const encontrado = findBlock(doc, blockId);
        if (!encontrado) return { ok: false, error: `O bloco "${blockId}" não existe.` };

        const definition = getBlockDefinition(encontrado.block.type);
        if (!definition) return { ok: false, error: `Bloco "${blockId}" com tipo desconhecido.` };

        // Valida o resultado da mesclagem, não o patch isolado: um patch
        // parcial sozinho nunca passaria no schema completo do bloco.
        const mesclado = { ...(encontrado.block.props as object), ...props };
        const validacao = definition.props.safeParse(mesclado);
        if (!validacao.success) {
          return { ok: false, error: descreverErro(encontrado.block.type, validacao.error.issues) };
        }

        return concluir(
          doc,
          { type: "update_block", blockId, patch: { props } },
          `Bloco ${blockId} atualizado`,
          [blockId],
        );
      }

      case "remove_block": {
        const { blockId } = entrada as { blockId: string };
        if (!findBlock(doc, blockId)) return { ok: false, error: `O bloco "${blockId}" não existe.` };

        return concluir(doc, { type: "remove_block", blockId }, `Bloco ${blockId} removido`, []);
      }

      case "move_block": {
        const { blockId, toStepId, toIndex } = entrada as {
          blockId: string;
          toStepId: string;
          toIndex: number;
        };

        if (!findBlock(doc, blockId)) return { ok: false, error: `O bloco "${blockId}" não existe.` };
        if (!doc.steps.some((s) => s.id === toStepId)) {
          return { ok: false, error: `A tela "${toStepId}" não existe.` };
        }

        return concluir(
          doc,
          { type: "move_block", blockId, toStepId, toIndex },
          `Bloco ${blockId} movido`,
          [blockId],
        );
      }

      case "set_step_logic": {
        const { stepId, rules } = entrada as {
          stepId: string;
          rules: { id: string; goto: string; when: AiCondition }[];
        };

        const step = doc.steps.find((s) => s.id === stepId);
        if (!step) return { ok: false, error: `A tela "${stepId}" não existe.` };

        for (const rule of rules) {
          if (!doc.steps.some((s) => s.id === rule.goto)) {
            return { ok: false, error: `A regra "${rule.id}" aponta para "${rule.goto}", que não existe.` };
          }
        }

        const convertidas = rules.map((rule) => ({
          id: rule.id,
          goto: rule.goto,
          when: converterCondicao(rule.when),
        }));

        return concluir(
          doc,
          { type: "update_step", stepId, patch: { logic: { ...step.logic, rules: convertidas } } },
          `Lógica da tela "${step.name}" definida`,
          [],
        );
      }

      case "branch_by_answer": {
        const { stepId, blockId, branches, replace } = entrada as {
          stepId: string;
          blockId?: string;
          branches: { optionId: string; goto: string }[];
          replace?: boolean;
        };

        const step = doc.steps.find((s) => s.id === stepId);
        if (!step) return { ok: false, error: `A tela "${stepId}" não existe.` };

        const escolha = primeiroBlocoDeEscolha(step, blockId);
        if (!escolha) {
          return {
            ok: false,
            error: `A tela "${stepId}" não tem bloco de escolha para ramificar. Adicione um bloco "choice" antes.`,
          };
        }

        const idsDeOpcao = new Set(escolha.props.options.map((o) => o.id));

        for (const branch of branches) {
          if (!idsDeOpcao.has(branch.optionId)) {
            return {
              ok: false,
              error: `A opção "${branch.optionId}" não existe em "${escolha.id}". Opções válidas: ${[...idsDeOpcao].join(", ")}.`,
            };
          }
          if (!doc.steps.some((s) => s.id === branch.goto)) {
            return {
              ok: false,
              error: `A tela "${branch.goto}" não existe. Crie-a com add_step antes de ramificar para ela.`,
            };
          }
        }

        return concluir(
          doc,
          { type: "branch_by_answer", stepId, blockId: escolha.id, branches, replace },
          `Ramificação criada em "${step.name}" com ${branches.length} caminhos`,
          [escolha.id],
        );
      }

      case "set_block_visibility": {
        const { blockId, when } = entrada as { blockId: string; when: AiCondition | null };

        const encontrado = findBlock(doc, blockId);
        if (!encontrado) return { ok: false, error: `O bloco "${blockId}" não existe.` };

        return concluir(
          doc,
          {
            type: "update_block",
            blockId,
            patch: { visibleIf: when ? converterCondicao(when) : null },
          },
          when
            ? `Bloco ${blockId} agora só aparece sob condição`
            : `Bloco ${blockId} voltou a aparecer sempre`,
          [blockId],
        );
      }

      case "check_funnel": {
        const problemas = lintFunnel(doc);

        // Não muda nada, então não passa pelo `concluir` — o valor está no
        // relatório que volta para o modelo.
        return {
          ok: true,
          doc,
          resumo: resumirIssues(problemas),
          blocosTocados: [],
        };
      }

      case "ask_user": {
        // Executada no cliente; o servidor não deveria chegar aqui.
        return { ok: false, error: "ask_user é respondida pelo usuário, não pelo servidor." };
      }

      case "set_theme": {
        const entradaTema = entrada as Record<string, string | number | undefined>;
        const patch: ThemePatch = {};

        const cores = ["bg", "surface", "text", "muted", "primary", "primaryFg", "accent", "border"] as const;
        const colors: Record<string, string> = {};

        for (const cor of cores) {
          const valor = entradaTema[cor];
          if (typeof valor !== "string") continue;
          if (!/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(valor)) {
            return { ok: false, error: `A cor "${cor}" precisa ser hexadecimal, ex.: #1a1a2e.` };
          }
          colors[cor] = valor;
        }

        if (Object.keys(colors).length > 0) patch.colors = colors as ThemePatch["colors"];

        if (entradaTema.headingFont || entradaTema.bodyFont) {
          patch.typography = {
            ...doc.theme.typography,
            ...(entradaTema.headingFont
              ? { heading: { ...doc.theme.typography.heading, family: String(entradaTema.headingFont) } }
              : {}),
            ...(entradaTema.bodyFont
              ? { body: { ...doc.theme.typography.body, family: String(entradaTema.bodyFont) } }
              : {}),
          };
        }

        if (entradaTema.buttonVariant || entradaTema.buttonRadius) {
          patch.button = {
            ...(entradaTema.buttonVariant
              ? { variant: entradaTema.buttonVariant as never }
              : {}),
            ...(entradaTema.buttonRadius ? { radius: entradaTema.buttonRadius as never } : {}),
          };
        }

        if (typeof entradaTema.contentWidth === "number") {
          patch.contentWidth = entradaTema.contentWidth;
        }

        return concluir(doc, { type: "set_theme", patch }, "Tema atualizado", []);
      }

      case "submit_plan": {
        const { screens } = entrada as {
          screens: { name: string; type: StepType; purpose: string; blocks: string[]; personalization?: string }[];
        };

        // Mesmo critério de `temEntrada`/`verificarOfertaFinal` em lint.ts, só
        // que sobre a lista de tipos de bloco do plano — o documento ainda nem
        // existe.
        const perguntas = screens.filter(
          (s) => s.type === "question" && (s.blocks.includes("choice") || s.blocks.includes("input")),
        ).length;

        if (perguntas >= MIN_PERGUNTAS_PARA_EXIGIR_PERSONALIZACAO) {
          const oferta = [...screens].reverse().find((s) => s.type === "checkout");

          if (
            oferta &&
            (oferta.blocks.length < MIN_BLOCOS_TELA_OFERTA || !temVariedadeDeFechamento(oferta.blocks))
          ) {
            return {
              ok: false,
              error: `A tela de oferta "${oferta.name}" do plano tem só ${oferta.blocks.length} bloco(s) e pouca variedade de fechamento — um funil com ${perguntas} perguntas precisa de uma oferta à altura. Replaneje com pelo menos ${MIN_BLOCOS_TELA_OFERTA} blocos, incluindo pricing, guarantee e mais um de prova ou objeção (testimonials, marquee, faq, countdown ou terms).`,
            };
          }
        }

        // Não muda o documento — o plano só destrava as demais ferramentas no
        // modo cuidadoso (ver `prepareStep` em route.ts).
        return {
          ok: true,
          doc,
          resumo: `Plano aceito: ${screens.length} tela(s).`,
          blocosTocados: [],
        };
      }

      case "set_variables": {
        const { variables } = entrada as {
          variables: { key: string; label?: string; source: "query" | "constant"; defaultValue?: string }[];
        };

        // Substitui por `key`, sem apagar variáveis declaradas em turnos
        // anteriores da mesma conversa.
        const porChave = new Map(doc.variables.map((v) => [v.key, v]));
        for (const variavel of variables) porChave.set(variavel.key, variavel);

        return concluir(
          doc,
          { type: "set_funnel", patch: { variables: [...porChave.values()] } },
          `Variáveis atualizadas (${porChave.size})`,
          [],
        );
      }

      default:
        return { ok: false, error: `Ferramenta desconhecida: ${nome}` };
    }
  } catch (erro) {
    return { ok: false, error: erro instanceof Error ? erro.message : "Falha ao aplicar a operação." };
  }
}

function concluir(
  doc: FunnelDocument,
  op: FunnelOp,
  resumo: string,
  blocosTocados: string[],
): AplicacaoResultado {
  const proximo = applyOp(doc, op);

  if (proximo === doc) {
    return { ok: false, error: "A operação não mudou nada. Confira os ids informados." };
  }

  return { ok: true, doc: proximo, resumo, blocosTocados };
}

/** Achatada para a IA, recursiva para o motor. */
export function converterCondicao(condicao: AiCondition): Condition {
  const folhas: Condition[] = condicao.rules.map((rule) => ({
    kind: "leaf" as const,
    ref: { source: rule.source, key: rule.key },
    op: rule.op,
    value: rule.value,
  }));

  if (folhas.length === 1) return folhas[0];
  return { kind: condicao.match, conditions: folhas };
}

function escolherId(doc: FunnelDocument, sugerido: string): string {
  const usados = collectBlockIds(doc);
  if (!usados.has(sugerido)) return sugerido;

  for (let n = 2; n < 500; n++) {
    const candidato = `${sugerido}_${n}`;
    if (!usados.has(candidato)) return candidato;
  }

  return `${sugerido}_${Date.now()}`;
}

/**
 * Dois campos com o mesmo `name` gravariam na mesma chave e um apagaria o
 * outro. A IA erra nisso com frequência ao repetir um exemplo, então corrigimos
 * em silêncio em vez de recusar a operação.
 */
function garantirNomeUnicoDeCampo(doc: FunnelDocument, block: Block) {
  if (block.type !== "choice" && block.type !== "input") return;

  const usados = collectAnswerNames(doc);
  if (!usados.has(block.props.name)) return;

  for (let n = 2; n < 500; n++) {
    const candidato = `${block.props.name}_${n}`;
    if (!usados.has(candidato)) {
      block.props.name = candidato;
      return;
    }
  }
}

/**
 * Um container pode chegar com `children` já populado — a IA monta colunas
 * inteiras numa chamada só de `add_block`. `escolherId`/`garantirNomeUnicoDeCampo`
 * acima só cobrem o bloco de nível raiz: sem isto, dois filhos do mesmo
 * container com o mesmo id ou o mesmo nome de campo colidiriam em silêncio —
 * `findBlock` acha só o primeiro, e o segundo vira inalcançável por qualquer
 * `update_block`/`remove_block` futuro que tente chegar nele pelo id duplicado.
 */
function garantirBlocosUnicosDoContainer(doc: FunnelDocument, block: Block) {
  if (!isContainer(block)) return;

  const idsUsados = collectBlockIds(doc);
  const nomesUsados = collectAnswerNames(doc);

  for (const child of block.props.children) {
    child.id = uniqueId(child.id, idsUsados);
    idsUsados.add(child.id);

    if (child.type === "choice" || child.type === "input") {
      child.props.name = uniqueId(child.props.name, nomesUsados);
      nomesUsados.add(child.props.name);
    }
  }
}

function primeiroBlocoDeEscolha(step: Step, blockId?: string) {
  for (const block of walkBlocks(step.blocks)) {
    if (block.type !== "choice") continue;
    if (!blockId || block.id === blockId) return block;
  }
  return null;
}

type IssueResumido = {
  path: PropertyKey[];
  message: string;
  /** Erro de chave/elemento de record (ex.: uma chave de `scores` fora do padrão) */
  issues?: IssueResumido[];
  /** Erro de `z.union`: um lote de issues por alternativa tentada */
  errors?: IssueResumido[][];
};

function descreverErro(tipo: string, issues: IssueResumido[]): string {
  const detalhes = issues
    .slice(0, 4)
    .map((issue) => `${issue.path.join(".") || "props"}: ${mensagemDoIssue(issue)}`)
    .join("; ");

  const definition = getBlockDefinition(tipo);
  const exemplo = definition ? ` Exemplo válido: ${JSON.stringify(definition.example)}` : "";

  return `As props do bloco "${tipo}" estão inválidas — ${detalhes}.${exemplo}`;
}

/**
 * Erro de chave de record (ex.: "valor percebido" em `scores`) ou de união vem
 * com a mensagem útil escondida um nível abaixo — sozinho, o Zod devolve algo
 * genérico como "Invalid key in record", que não diz à IA o que corrigir.
 */
function mensagemDoIssue(issue: IssueResumido): string {
  if (issue.issues?.[0]) return mensagemDoIssue(issue.issues[0]);
  if (issue.errors?.[0]?.[0]) return mensagemDoIssue(issue.errors[0][0]);
  return issue.message;
}
