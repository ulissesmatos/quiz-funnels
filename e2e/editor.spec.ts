import { expect, test, type Page } from "@playwright/test";

/**
 * Fluxo completo do editor: criar funil, montar uma tela, publicar e conferir
 * o resultado na URL pública.
 *
 * Cada execução cria o próprio funil, com nome único, para os testes não
 * disputarem o mesmo registro quando rodam em paralelo.
 *
 * Depende do seed: pnpm db:seed
 */

/**
 * Em `next dev` a primeira visita a cada rota paga a compilação sob demanda —
 * o editor puxa dnd-kit e o renderer inteiro e leva vários segundos. Não é
 * lentidão do produto, mas os timeouts padrão não dão conta.
 */
const ESPERA_LENTA = { timeout: 45_000 };

async function entrar(page: Page) {
  await page.goto("/entrar");
  await page.getByRole("textbox", { name: "E-mail" }).fill("demo@local.dev");
  await page.getByLabel("Senha").fill("demo12345");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("heading", { name: "Meus funis" })).toBeVisible(ESPERA_LENTA);
}

async function criarFunil(page: Page, nome: string) {
  await page.getByPlaceholder("Nome do novo funil").fill(nome);
  await page.getByRole("button", { name: "Criar" }).click();
  // Escopado ao canvas: o anunciador de rota do Next repete o mesmo texto.
  await expect(page.locator(".ed-canvas-frame")).toContainText("Sua promessa aqui", ESPERA_LENTA);
}

test.describe("editor", () => {
  test.setTimeout(120_000);

  test("cria um funil, edita e publica", async ({ page }) => {
    const nome = `Teste ${Date.now()}`;

    await entrar(page);
    await criarFunil(page, nome);
    await expect(page.getByRole("button", { name: "Publicar" })).toBeVisible();

    // Adicionar um bloco pela paleta (toque, o caminho que funciona no celular)
    await abrirPaleta(page);
    await page.getByRole("button", { name: "Opções", exact: true }).click();
    await expect(page.locator(".ed-canvas-frame")).toContainText("Primeira opção");

    // Selecionar o título já existente e reescrevê-lo pelo inspector
    await page.locator('.ed-block[data-block-id="blk_titulo"]').click();
    await abrirAjustes(page);

    await expect(page.getByRole("heading", { name: "Título" })).toBeVisible();
    await page.getByLabel("Texto", { exact: true }).fill("Qual é o seu maior desafio hoje?");
    await fecharGaveta(page);

    // A mudança aparece no canvas imediatamente
    await expect(page.locator(".ed-canvas-frame")).toContainText("Qual é o seu maior desafio hoje?");

    // Autosave marca como salvo sem precisar de ação nenhuma.
    // Escopado ao cabeçalho: o dnd-kit mantém a própria região role="status".
    await expect(page.locator("header").getByRole("status")).toHaveAttribute(
      "aria-label",
      "Salvo",
      { timeout: 20_000 },
    );

    // Publicar
    await page.getByRole("button", { name: "Publicar" }).click();
    await expect(page.getByRole("button", { name: "Publicado" })).toBeVisible({ timeout: 15_000 });

    // Conferir na URL pública
    const slug = nome.toLowerCase().replace(/\s+/g, "-");
    await page.goto(`/f/${slug}`);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Qual é o seu maior desafio hoje?",
    );
  });

  test("desfazer reverte a última edição", async ({ page }) => {
    const nome = `Undo ${Date.now()}`;

    await entrar(page);
    await criarFunil(page, nome);

    await abrirPaleta(page);
    await page.getByRole("button", { name: "Título", exact: true }).click();

    // Dois títulos na tela: o padrão e o recém-adicionado
    await expect(page.locator('.ed-block[data-block-id^="blk_heading"]')).toHaveCount(1);

    await page.getByRole("button", { name: "Desfazer" }).click();
    await expect(page.locator('.ed-block[data-block-id^="blk_heading"]')).toHaveCount(0);
  });
});

/**
 * Deixa a paleta de elementos à mão: no celular ela vive numa gaveta, e nos dois
 * tamanhos fica atrás da aba "Elementos".
 */
async function abrirPaleta(page: Page) {
  const gaveta = page.getByRole("button", { name: "Telas e blocos" });
  if (await gaveta.isVisible()) await gaveta.click();

  await page.getByRole("button", { name: "Elementos" }).click();
}

async function abrirAjustes(page: Page) {
  const botao = page.getByRole("button", { name: "Ajustes" });
  if (await botao.isVisible()) await botao.click();
}

/** No celular a gaveta cobre o canvas; no desktop não existe gaveta. */
async function fecharGaveta(page: Page) {
  const fechar = page.getByRole("button", { name: "Fechar painel" });
  if (await fechar.isVisible()) await fechar.click();
}
