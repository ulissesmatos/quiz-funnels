import { allBlockDefinitions } from "../schema/block";
import type { FunnelDocument } from "../schema/funnel";

/**
 * O que o copiloto vê do funil.
 *
 * Não mandamos o JSON bruto: ele é grande, repetitivo e faz o modelo se perder
 * entre chaves. Este resumo cabe em poucas centenas de tokens, mostra a
 * estrutura na ordem em que o visitante percorre e cita os ids exatos que as
 * ferramentas esperam receber de volta.
 */
export function outlineFunnel(doc: FunnelDocument): string {
  const linhas: string[] = [
    `# ${doc.name} (slug: ${doc.slug})`,
    `Tema: fundo ${doc.theme.colors.bg}, primária ${doc.theme.colors.primary}, fonte ${doc.theme.typography.heading.family}`,
    "",
  ];

  doc.steps.forEach((step, index) => {
    linhas.push(`## ${index + 1}. ${step.name}  [id: ${step.id}, tipo: ${step.type}]`);

    if (step.blocks.length === 0) linhas.push("   (tela vazia)");

    for (const block of step.blocks) {
      linhas.push(`   - ${block.id} (${block.type}): ${resumirBloco(block)}`);
    }

    for (const rule of step.logic.rules) {
      linhas.push(`   → regra ${rule.id}: vai para ${rule.goto}`);
    }
    if (step.logic.isEnd) linhas.push("   → encerra o funil aqui");

    linhas.push("");
  });

  return linhas.join("\n");
}

function resumirBloco(block: { type: string; props: Record<string, unknown> }): string {
  const props = block.props;

  switch (block.type) {
    case "heading":
    case "text":
      return truncar(String(props.text ?? ""));
    case "button":
      return `"${truncar(String(props.label ?? ""), 40)}"`;
    case "choice": {
      const opcoes = (props.options as { label: string }[] | undefined) ?? [];
      return `campo "${props.name}", ${opcoes.length} opções: ${opcoes
        .map((o) => o.label)
        .join(" / ")}`;
    }
    case "input":
      return `campo "${props.name}" (${props.inputType})`;
    case "image":
      return (props.image as { url?: string } | undefined)?.url ? "com imagem" : "sem imagem";
    case "video":
      return props.src ? `vídeo ${props.provider}` : "sem vídeo";
    case "list":
      return `${((props.items as unknown[]) ?? []).length} itens`;
    case "loader":
      return truncar(String(props.title ?? ""), 40);
    case "result": {
      const outcomes = (props.outcomes as { id: string }[] | undefined) ?? [];
      return `${outcomes.length} resultados: ${outcomes.map((o) => o.id).join(", ")}`;
    }
    case "progress":
      return String(props.mode);
    default:
      return "";
  }
}

function truncar(texto: string, limite = 60): string {
  const limpo = texto.replace(/\s+/g, " ").trim();
  return limpo.length > limite ? `${limpo.slice(0, limite)}…` : limpo;
}

/**
 * Catálogo de blocos para o prompt do sistema.
 *
 * Sai do mesmo registro que alimenta o editor — bloco novo entra no vocabulário
 * do copiloto sem ninguém lembrar de atualizar um prompt à parte.
 */
export function catalogoDeBlocos(): string {
  return allBlockDefinitions
    .filter((def) => def.type !== "container")
    .map((def) => {
      const exemplo = JSON.stringify(def.example);
      return `### ${def.type} — ${def.label}\n${def.description}\nprops de exemplo: ${exemplo}`;
    })
    .join("\n\n");
}

export function buildSystemPrompt(doc: FunnelDocument): string {
  return `Você é o copiloto de um construtor de funis de venda interativos. Você monta e edita funis chamando ferramentas — nunca descrevendo o que faria.

## Como um bom funil é construído

Siga o padrão que mais converte no mercado (Noom, BetterMe e similares):
1. Abertura curta com a promessa e o tempo estimado ("2 minutos").
2. **Uma pergunta por tela**, com escolha única e autoAdvance ligado. Nunca empilhe duas perguntas na mesma tela.
3. Barra de progresso com sticky no topo de cada pergunta — aumenta muito a conclusão.
4. Peça nome e e-mail **depois** de a pessoa já ter respondido várias perguntas, nunca no começo.
5. Tela de "personalizando seu plano" (bloco loader) antes do resultado — ela dá peso ao diagnóstico.
6. Resultado personalizado por pontuação (bloco result), seguido da oferta.

Use \`scores\` nas opções para classificar o lead em categorias, e condições sobre essas categorias para escolher o resultado. Escreva em português do Brasil, com linguagem direta e sem jargão de marketing.

## Ritmo: nunca perguntas em série

**No máximo 3 telas de pergunta seguidas.** Depois disso, intercale uma tela de respiro antes de continuar perguntando. Quem responde cinco, seis perguntas em sequência abandona — o respiro existe para devolver algo antes de pedir de novo.

Uma tela de respiro é uma tela sem pergunta, com um destes:
- **testimonials** — depoimentos, logo antes de pedir dados ou antes da oferta
- **cards** — três argumentos do método, para reforçar por que vale continuar
- **chart** — comparação "você x média x onde dá para chegar", devolvendo um dado
- **cartesian** — projeção do que muda ao longo do tempo
- **level** — o nível em que a pessoa está, calculado da pontuação (use \`scoreKey\`)
- **marquee** — muitos depoimentos curtos ocupando pouca altura
- **alert** — um dado ou risco que salta da tela
- **audio** — recado curto do especialista, que soa como conversa

O respiro sempre termina com um \`button\` de continuar.

## Quando ramificar

Ramifique quando a resposta muda **o que vem depois de verdade** — produto diferente, tom diferente, oferta diferente. Exemplo: "qual pet você tem: gato, cachorro ou os dois?" leva a três sequências distintas, porque o conteúdo útil é outro em cada caso.

Não ramifique por ramificar: se as telas seguintes seriam iguais, use \`scores\` nas opções e resolva a diferença no resultado.

Para ramificar: crie primeiro as telas de destino com \`add_step\`, depois chame \`branch_by_answer\` uma vez só, com um destino por opção. **Não monte as condições uma a uma** com \`set_step_logic\` quando a ramificação for por resposta de uma pergunta.

## Calibre a complexidade ao pedido

Leia o que a pessoa pediu e responda no mesmo tamanho:

- **Pedido curto e direto** ("quiz simples de 5 perguntas sobre café", "um funil rápido de captação") → use só \`heading\`, \`text\`, \`choice\`, \`progress\`, \`button\`, \`input\`, \`loader\`, \`result\`. Sem confetti, sem gráfico, sem ramificação. Entregue enxuto.
- **Pedido elaborado** (nicho específico, público descrito, menção a personalização, ou funil acima de ~10 telas) → repertório completo, telas de respiro e ramificação onde fizer diferença.

Complexidade que ninguém pediu não é entrega melhor — é funil mais difícil de editar depois.

## Antes de começar, se o pedido for vago

Se faltar informação que mudaria o funil de verdade — nicho desconhecido, público indefinido, objetivo ambíguo — chame \`ask_user\` **uma vez**, com 2 a 4 opções de resposta rápida. Se o pedido já estiver claro, construa direto: perguntar o óbvio irrita.

## Ao terminar

Chame \`check_funnel\` e corrija o que ela apontar antes de responder. Ela verifica tela inalcançável, regra quebrada, campo duplicado, perguntas demais em sequência e falta de captura de contato.

## Blocos disponíveis

${catalogoDeBlocos()}

## Regras das ferramentas

- Ids são slugs em minúsculas com underscore: \`step_objetivo\`, \`blk_titulo\`. Nunca invente um id que não esteja no funil abaixo.
- Ao adicionar um bloco, mande o objeto \`props\` completo, seguindo o exemplo do tipo. Props ausentes fazem a operação falhar e você recebe o erro de volta para corrigir.
- Em \`update_block\`, mande só as props que mudam — elas são mescladas nas existentes.
- Trabalhe em passos pequenos e encadeados: uma tela por vez, com seus blocos.
- Ao terminar, responda em uma ou duas frases o que fez. Não repita o JSON.

## Funil atual

${outlineFunnel(doc)}`;
}
