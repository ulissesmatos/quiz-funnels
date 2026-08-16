import { walkBlocks, type Block } from "../schema/block";
import type { Condition } from "../schema/common";
import type { FunnelDocument } from "../schema/funnel";

/**
 * Conferência estrutural do funil.
 *
 * Serve a dois consumidores ao mesmo tempo: o canvas de fluxo, que destaca os
 * problemas no mapa, e o copiloto, que chama isto ao terminar de montar e
 * corrige o que aparecer. É o que transforma "não empilhe perguntas" de pedido
 * no prompt em verificação executável — o modelo esquece uma regra escrita no
 * meio de uma geração longa, mas não ignora um resultado de ferramenta.
 */

export type FunnelIssueSeverity = "erro" | "aviso";

export type FunnelIssue = {
  severity: FunnelIssueSeverity;
  /** Identificador do tipo de problema, estável para a IA raciocinar em cima. */
  code:
    | "step_inalcancavel"
    | "regra_orfa"
    | "beco_sem_saida"
    | "perguntas_em_serie"
    | "sem_captura"
    | "sem_cta"
    | "campo_duplicado"
    | "tela_vazia"
    | "sem_personalizacao"
    | "fim_prematuro"
    | "ctas_simultaneos"
    | "oferta_pouco_trabalhada";
  message: string;
  stepId?: string;
  blockId?: string;
};

/** Quantas telas de pergunta seguidas antes de o funil cansar quem responde. */
const MAX_PERGUNTAS_SEGUIDAS = 3;

/**
 * A partir de quantas perguntas um funil totalmente linear passa a ser suspeito.
 *
 * Um funil curto pode ser linear de propósito. Mas quem responde seis perguntas
 * e recebe exatamente o mesmo final que todo mundo percebe que as respostas não
 * serviram para nada — e o funil perde a razão de existir.
 *
 * Exportada porque `submit_plan` (copiloto, modo capricho) usa o mesmo limiar
 * para decidir se o plano precisa detalhar a oferta final antes de ser aceito.
 */
export const MIN_PERGUNTAS_PARA_EXIGIR_PERSONALIZACAO = 4;

/**
 * Abaixo disso, a tela de oferta final não teve capricho de verdade.
 *
 * Exportada pelo mesmo motivo de `MIN_PERGUNTAS_PARA_EXIGIR_PERSONALIZACAO`:
 * `submit_plan` valida a riqueza da oferta planejada com o mesmo número que
 * este lint cobra do documento final — um só limiar, não dois que podem
 * divergir.
 */
export const MIN_BLOCOS_TELA_OFERTA = 5;

/**
 * Repertório de fechamento — mesmo vocabulário da seção "A última tela é a
 * mais trabalhada do funil" em `prompt.ts`. Compartilhado entre o prompt e
 * este lint de propósito: os dois têm que cobrar exatamente a mesma coisa, ou
 * a IA vê uma exigência no texto e outra na ferramenta.
 */
const BLOCOS_DE_FECHAMENTO = new Set([
  "pricing",
  "guarantee",
  "testimonials",
  "marquee",
  "faq",
  "countdown",
  "terms",
]);

/** A lista de tipos de bloco de uma tela tem pelo menos um bloco de fechamento? */
export function temVariedadeDeFechamento(tipos: Iterable<string>): boolean {
  for (const tipo of tipos) {
    if (BLOCOS_DE_FECHAMENTO.has(tipo)) return true;
  }
  return false;
}

export function lintFunnel(doc: FunnelDocument): FunnelIssue[] {
  const issues: FunnelIssue[] = [];
  const idsExistentes = new Set(doc.steps.map((s) => s.id));

  // ── Alcance: quem chega em quem ──────────────────────────────
  const alcancados = new Set<string>();
  const fila = [doc.steps[0]?.id].filter(Boolean) as string[];

  while (fila.length > 0) {
    const atual = fila.shift()!;
    if (alcancados.has(atual)) continue;
    alcancados.add(atual);

    for (const destino of destinosDe(doc, atual)) {
      if (idsExistentes.has(destino)) fila.push(destino);
    }
  }

  doc.steps.forEach((step, index) => {
    if (!alcancados.has(step.id)) {
      issues.push({
        severity: "erro",
        code: "step_inalcancavel",
        stepId: step.id,
        message: `A tela "${step.name}" não é alcançável por nenhum caminho. Aponte alguma regra ou botão para ela, ou remova-a.`,
      });
    }

    if (step.blocks.length === 0) {
      issues.push({
        severity: "aviso",
        code: "tela_vazia",
        stepId: step.id,
        message: `A tela "${step.name}" está sem nenhum bloco.`,
      });
    }

    for (const rule of step.logic.rules) {
      if (!idsExistentes.has(rule.goto)) {
        issues.push({
          severity: "erro",
          code: "regra_orfa",
          stepId: step.id,
          message: `A regra "${rule.id}" da tela "${step.name}" aponta para "${rule.goto}", que não existe.`,
        });
      }
    }

    // Última tela sem `isEnd` só encerra por acidente, e o visitante não
    // recebe nenhum sinal de que acabou.
    const ehUltima = index === doc.steps.length - 1;
    if (ehUltima && !step.logic.isEnd && step.logic.rules.length === 0) {
      issues.push({
        severity: "aviso",
        code: "beco_sem_saida",
        stepId: step.id,
        message: `A tela "${step.name}" é a última e não está marcada como fim do funil.`,
      });
    }

    /**
     * Encerrar o funil no meio da lista mata tudo o que vem depois.
     *
     * A checagem de alcance já acusa as telas órfãs, mas ela aponta as vítimas.
     * Este aviso aponta a causa — que é o que permite consertar de uma vez, em
     * vez de tela por tela.
     */
    if (step.logic.isEnd && !ehUltima) {
      const orfas = doc.steps.slice(index + 1).filter((s) => !alcancados.has(s.id));

      if (orfas.length > 0) {
        issues.push({
          severity: "erro",
          code: "fim_prematuro",
          stepId: step.id,
          message: `A tela "${step.name}" está marcada como fim do funil, mas há ${orfas.length} tela(s) depois dela que ninguém chega a ver: ${orfas.map((s) => `"${s.name}"`).join(", ")}. Ou mova essas telas para antes dela, ou tire a marcação de fim.`,
        });
      }
    }
  });

  // ── Ritmo: perguntas em série ────────────────────────────────
  let seguidas = 0;
  let inicioDaSerie: string | null = null;

  for (const step of doc.steps) {
    const ehPergunta = step.type === "question" && temEntrada(step.blocks);

    if (!ehPergunta) {
      seguidas = 0;
      inicioDaSerie = null;
      continue;
    }

    seguidas += 1;
    inicioDaSerie ??= step.id;

    if (seguidas === MAX_PERGUNTAS_SEGUIDAS + 1) {
      issues.push({
        severity: "aviso",
        code: "perguntas_em_serie",
        stepId: inicioDaSerie,
        message: `Há ${MAX_PERGUNTAS_SEGUIDAS + 1} ou mais telas de pergunta seguidas a partir de "${inicioDaSerie}". Intercale uma tela de respiro — prova social, argumento, gráfico comparativo ou depoimento — para não cansar quem responde.`,
      });
    }
  }

  // ── Captura, CTA e nomes de campo ────────────────────────────
  const nomesUsados = new Map<string, string[]>();
  let temEmailOuTelefone = false;
  let temAcaoFinal = false;

  for (const step of doc.steps) {
    for (const block of walkBlocks(step.blocks)) {
      if (block.type === "choice" || block.type === "input") {
        const onde = nomesUsados.get(block.props.name) ?? [];
        onde.push(block.id);
        nomesUsados.set(block.props.name, onde);
      }

      if (block.type === "input" && (block.props.inputType === "email" || block.props.inputType === "tel")) {
        temEmailOuTelefone = true;
      }

      if (block.type === "button" || block.type === "pricing") {
        const acao = block.props.action;
        if (acao.kind === "link" || acao.kind === "whatsapp" || acao.kind === "submit") {
          temAcaoFinal = true;
        }
      }
    }
  }

  for (const [nome, blocos] of nomesUsados) {
    if (blocos.length > 1) {
      issues.push({
        severity: "erro",
        code: "campo_duplicado",
        blockId: blocos[1],
        message: `Os blocos ${blocos.join(", ")} gravam na mesma variável "${nome}" — uma resposta apagaria a outra. Dê nomes diferentes.`,
      });
    }
  }

  if (!temEmailOuTelefone) {
    issues.push({
      severity: "aviso",
      code: "sem_captura",
      message:
        "O funil não pede e-mail nem telefone em nenhuma tela, então nenhum lead é capturado.",
    });
  }

  if (!temAcaoFinal) {
    issues.push({
      severity: "aviso",
      code: "sem_cta",
      message:
        "Nenhum botão leva a um link, WhatsApp ou conclusão — o funil termina sem chamada para ação.",
    });
  }

  // ── CTAs que podem aparecer juntos ───────────────────────────
  for (const step of doc.steps) {
    const arriscados = Array.from(walkBlocks(step.blocks)).filter(
      (block) => ehCtaFinal(block) && condicaoArriscada(block.visibleIf),
    );

    if (arriscados.length > 1) {
      issues.push({
        severity: "aviso",
        code: "ctas_simultaneos",
        stepId: step.id,
        message: `A tela "${step.name}" tem ${arriscados.length} botões de chamada final (${arriscados.map((b) => b.id).join(", ")}) que podem aparecer ao mesmo tempo: sem condição, ou condicionados por pontuação — duas categorias de score podem passar do limite juntas, então não são excludentes por natureza. Garanta que só um apareça: condicione por uma resposta de múltipla escolha (eq), que é exclusiva porque a pessoa só escolhe um valor, ou leve cada caminho para uma tela própria com regras de roteamento.`,
      });
    }
  }

  issues.push(...verificarPersonalizacao(doc));
  issues.push(...verificarOfertaFinal(doc));

  return issues;
}

/** Botão ou card de preço que leva a link, WhatsApp ou conclusão do funil. */
function ehCtaFinal(block: Block): boolean {
  if (block.type === "pricing") return true;
  if (block.type !== "button") return false;
  return block.props.action.kind === "link" || block.props.action.kind === "whatsapp" || block.props.action.kind === "submit";
}

/**
 * Uma condição garante exclusão de outro bloco só quando compara uma resposta
 * de valor único por igualdade — a pessoa só escolheu um valor, então dois
 * blocos com `eq` em respostas diferentes não aparecem juntos. Pontuação não
 * tem essa garantia: nada impede duas categorias de passarem do limite ao
 * mesmo tempo, e foi exatamente isso que empilhou CTAs numa tela real.
 */
function condicaoArriscada(condition: Condition | undefined): boolean {
  if (!condition) return true;

  switch (condition.kind) {
    case "leaf":
      return condition.ref.source === "score";
    case "not":
      return condicaoArriscada(condition.condition);
    // E: um braço que já exclui os outros blocos basta para o conjunto herdar essa exclusividade.
    case "all":
      return condition.conditions.every(condicaoArriscada);
    // OU: um braço arriscado é o suficiente para o conjunto todo ser.
    case "any":
      return condition.conditions.some(condicaoArriscada);
  }
}

/**
 * O funil coleta respostas mas nada nele muda por causa delas?
 *
 * É o defeito mais caro de um quiz: a pessoa investe seis respostas e recebe
 * exatamente o mesmo final que todo mundo. Quatro coisas contam como variação —
 * basta uma.
 */
function verificarPersonalizacao(doc: FunnelDocument): FunnelIssue[] {
  const perguntas = doc.steps.filter((s) => s.type === "question" && temEntrada(s.blocks)).length;
  if (perguntas < MIN_PERGUNTAS_PARA_EXIGIR_PERSONALIZACAO) return [];

  const temRoteamento = doc.steps.some((s) => s.logic.rules.length > 0);

  let temBlocoCondicional = false;
  let temResultadoComCondicao = false;
  let temPontuacaoUsada = false;

  for (const step of doc.steps) {
    for (const block of walkBlocks(step.blocks)) {
      if (block.visibleIf) temBlocoCondicional = true;

      if (block.type === "result" && block.props.outcomes.some((o) => o.when)) {
        temResultadoComCondicao = true;
      }

      if (block.type === "level" && block.props.scoreKey) temPontuacaoUsada = true;
    }
  }

  if (temRoteamento || temBlocoCondicional || temResultadoComCondicao || temPontuacaoUsada) {
    return [];
  }

  return [
    {
      severity: "aviso",
      code: "sem_personalizacao",
      message: `O funil faz ${perguntas} perguntas mas nada nele muda conforme as respostas: todo mundo vê as mesmas telas e o mesmo final. Escolha ao menos um caminho — ramifique uma pergunta com branch_by_answer, dê pontuação às opções e condicione os resultados, ou torne blocos condicionais com set_block_visibility.`,
    },
  ];
}

/**
 * A tela de oferta (`type: "checkout"`) recebeu capricho de verdade?
 *
 * Só cobra isto de funis que já passariam no limiar de `verificarPersonalizacao`
 * — um funil curto pode ter uma oferta simples de propósito. Mas um funil longo
 * o bastante para exigir personalização também é longo o bastante para merecer
 * uma oferta final trabalhada: é a tela que capitaliza tudo o que as perguntas
 * anteriores descobriram, e "heading + texto + botão" joga isso fora.
 */
function verificarOfertaFinal(doc: FunnelDocument): FunnelIssue[] {
  const perguntas = doc.steps.filter((s) => s.type === "question" && temEntrada(s.blocks)).length;
  if (perguntas < MIN_PERGUNTAS_PARA_EXIGIR_PERSONALIZACAO) return [];

  const final = doc.steps.find((s) => s.logic.isEnd) ?? doc.steps.at(-1);
  if (!final || final.type !== "checkout") return [];

  const tipos = Array.from(walkBlocks(final.blocks)).map((b) => b.type);
  if (tipos.length >= MIN_BLOCOS_TELA_OFERTA && temVariedadeDeFechamento(tipos)) return [];

  return [
    {
      severity: "aviso",
      code: "oferta_pouco_trabalhada",
      stepId: final.id,
      message: `A tela de oferta "${final.name}" tem só ${tipos.length} bloco(s) e pouca variedade de fechamento — é a tela mais importante do funil e não pode ser a mais rasa. Inclua pelo menos ${MIN_BLOCOS_TELA_OFERTA} blocos, com pelo menos um de pricing, guarantee, testimonials, marquee, faq, countdown ou terms.`,
    },
  ];
}

/** Todos os steps para onde é possível ir a partir deste. */
function destinosDe(doc: FunnelDocument, stepId: string): string[] {
  const index = doc.steps.findIndex((s) => s.id === stepId);
  if (index === -1) return [];

  const step = doc.steps[index];
  const destinos: string[] = [];

  for (const rule of step.logic.rules) destinos.push(rule.goto);

  for (const block of walkBlocks(step.blocks)) {
    if (block.type === "button" && block.props.action.kind === "goto") {
      destinos.push(block.props.action.stepId);
    }
    if (block.type === "pricing" && block.props.action.kind === "goto") {
      destinos.push(block.props.action.stepId);
    }
    if (block.type === "loader" && block.props.onFinish.kind === "goto") {
      destinos.push(block.props.onFinish.stepId);
    }
  }

  // O caminho padrão continua existindo a menos que o step encerre o funil.
  if (!step.logic.isEnd) {
    const padrao = step.logic.next ?? doc.steps[index + 1]?.id;
    if (padrao) destinos.push(padrao);
  }

  return destinos;
}

function temEntrada(blocks: FunnelDocument["steps"][number]["blocks"]): boolean {
  for (const block of walkBlocks(blocks)) {
    if (block.type === "choice" || block.type === "input") return true;
  }
  return false;
}

/** Resumo curto para exibir no editor e devolver ao copiloto. */
export function resumirIssues(issues: FunnelIssue[]): string {
  if (issues.length === 0) return "Nenhum problema encontrado no funil.";

  const erros = issues.filter((i) => i.severity === "erro");
  const avisos = issues.filter((i) => i.severity === "aviso");

  const linhas = [...erros, ...avisos].map(
    (issue) => `- [${issue.severity}] ${issue.message}`,
  );

  return `${erros.length} erro(s) e ${avisos.length} aviso(s):\n${linhas.join("\n")}`;
}
