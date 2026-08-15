# Funis — construtor de funis dinâmicos e interativos

Plataforma para criar funis de venda interativos (quizzes, calculadoras, VSL com
ramificação, telas de "personalizando seu plano"), no estilo inLead, Heyflow e
Perspective — com um copiloto de IA que monta o funil junto com você.

## Como rodar

```bash
cp .env.example .env          # ajuste se precisar
docker compose up -d          # postgres, minio e mailpit
pnpm install
pnpm db:migrate               # cria as tabelas
pnpm db:seed                  # usuário demo + funil de exemplo publicado
pnpm dev
```

- App: http://localhost:3000 — entre com `demo@local.dev` / `demo12345`
- Funil de exemplo: http://localhost:3000/f/metabolismo
- MinIO: http://localhost:9001 (`minioadmin` / `minioadmin`)
- Caixa de e-mail local: http://localhost:8025

> O Postgres do container publica em **5433**, não 5432, para não colidir com
> uma instalação nativa do Postgres na máquina. Esse conflito se manifesta como
> "senha inválida", que é confuso de diagnosticar.

## Verificação

```bash
pnpm typecheck
pnpm test                     # schema, lógica e utilitários (vitest)
pnpm exec playwright test     # funil público ponta a ponta, mobile e desktop
pnpm lint
```

## Como o projeto está organizado

```
src/
  funnel/          ← o CONTRATO, compartilhado por editor, renderer e IA
    schema/        Zod: Funnel, Step, Block, Theme, Condition
    blocks/        1 arquivo por bloco: schema, defaults, exemplo e descrição p/ IA
    logic/         pontuação, condições, roteamento, interpolação
    render/        renderer do funil público (sem Tailwind, só CSS variables)
    theme/         tema → CSS variables
    templates/     modelos prontos (o quiz de exemplo mora aqui)
  app/             rotas: (app) dashboard, (auth) acesso, (public) funil no ar
  server/          db (drizzle), auth (better-auth), ações de funil
  components/      primitivas de UI do shell (não do funil)
```

### Duas decisões que explicam o resto

**O documento do funil é um JSON só, validado por Zod.** Steps e blocos não são
tabelas: eles mudam a cada tecla no editor, e reescrever um `jsonb` é mais barato
que sincronizar dezenas de linhas — além de dar snapshot de versão de graça. O
rascunho fica em `funnels.document`; publicar cria uma linha imutável em
`funnel_versions`, e é dela que a página pública lê. Editar nunca altera o que
já está no ar.

**O schema foi desenhado para uma LLM ler e escrever.** IDs são slugs legíveis
(`blk_titulo_principal`), props são planas, toda união é discriminada por um
campo explícito, e cada bloco carrega uma `description` em português que vai
direto para o prompt do copiloto. Adicionar um bloco novo é criar um arquivo em
`src/funnel/blocks/definitions/` e incluí-lo no índice — o editor e a IA passam
a conhecê-lo sem nenhuma outra mudança.

### O canvas de fluxo

A aba **Fluxo**, ao lado do Construtor, mostra o funil como mapa: nós são as
telas, setas são as regras de roteamento e as ações de botão. Arrastar de uma
tela para outra cria a ramificação; clicar na seta edita a condição, com os
campos e as opções do funil já num select.

O mapa **não é um segundo modelo de dados** — ele lê e escreve o mesmo
documento. Editar o fluxo emite as mesmas operações de
[src/funnel/ops.ts](src/funnel/ops.ts) que o Construtor emite, então undo,
autosave e edição por IA continuam valendo sem nenhuma sincronização. A única
coisa que o documento guarda a mais é a posição de cada nó, num campo opcional.

Num nó de pergunta, o botão **Ramificar por resposta** cria uma tela por opção e
as regras correspondentes de uma vez — é o caminho de dois cliques para "qual
pet você tem: gato, cachorro ou os dois?" virar três caminhos de verdade.

### Conferência do funil

`lintFunnel()` ([src/funnel/logic/lint.ts](src/funnel/logic/lint.ts)) detecta
tela inalcançável, regra órfã, beco sem saída, campo duplicado, ausência de
captura e sequências longas de perguntas. Alimenta os avisos no mapa **e** é
exposto ao copiloto como a ferramenta `check_funnel`.

Isso importa: escrever "não empilhe perguntas" no prompt ajuda pouco, porque o
modelo esquece a regra no meio de uma geração longa. Como resultado de
ferramenta, ele enxerga o problema e corrige antes de responder.

### O copiloto

O painel de IA fica na aba **IA** do inspector. Ele edita o funil por operações
(`add_block`, `update_block`, `branch_by_answer`, …), nunca reescrevendo o
documento inteiro — e cada chamada é aplicada no canvas assim que fecha, então o
funil se monta na frente de quem pediu.

Além disso, o prompt calibra o resultado ao pedido: um "quiz simples de 5
perguntas" sai enxuto, com os blocos básicos; um pedido elaborado ganha telas de
respiro e ramificação. E quando o pedido é genuinamente ambíguo, a IA chama
`ask_user` — o stream pausa e um popup aparece sobre o campo do chat com opções
clicáveis, retomando de onde parou assim que você responde.

Três decisões que fazem isso funcionar:

- **As props do bloco entram como objeto livre na ferramenta.** A união dos 14
  schemas viraria um JSON Schema enorme e recursivo, que boa parte dos modelos
  preenche mal. O contrato de verdade está no prompt — que lista cada bloco com
  descrição e exemplo, gerados do mesmo registro que alimenta o editor — e a
  validação acontece na aplicação, devolvendo o erro ao modelo para ele corrigir.
- **O servidor mantém o próprio documento durante a conversa.** Sem isso, a
  segunda ferramenta não enxergaria a tela criada pela primeira.
- **Toda a resposta vira um passo de undo só.** Dezenas de operações, um Ctrl+Z.

Precisa de `OPENROUTER_API_KEY` no `.env`. Sem ela, a rota responde 503 com uma
mensagem explicando — o resto do editor continua funcionando normalmente.

## Estado atual

| Fase | O que entrega | Situação |
|---|---|---|
| 0 | Fundação: Docker, Drizzle, Better Auth com organizações, shell do app | ✅ |
| 1 | Schema + registry de 14 blocos + renderer público + funil de exemplo | ✅ |
| 2 | Editor visual: canvas com arrastar e soltar, inspector, undo/redo, publicar | ✅ |
| 3 | Motor de pontuação, condições AND/OR e roteamento entre telas | ✅ |
| 4 | Copiloto de IA aplicando mudanças no canvas durante a resposta | ✅ |
| 5 | Catálogo de 30 blocos: prova social, mídia, oferta e dados | ✅ |
| 7 | Canvas de fluxo com ramificação visual + conferência do funil | ✅ |
| 6 | Webhooks, e-mail via Resend, pixels, analytics de abandono | ⏳ |
| 8 | Upload de mídia para MinIO/S3 + biblioteca de imagens | ⏳ |

Cobertura de testes hoje: 52 unitários (schema, lógica, operações, lint e camada
da IA) e 12 e2e (funil público ponta a ponta, editor e canvas de fluxo).

O funil `/f/vitrine`, criado pelo seed, renderiza todos os blocos de uma vez —
é a forma mais rápida de ver o catálogo e conferir mudanças visuais.
