import { expect, test, type Page } from "@playwright/test";

/**
 * Canvas de fluxo: o mapa reflete o documento, ramificar por resposta cria os
 * caminhos, e o duplo clique leva de volta ao Construtor.
 *
 * Cada teste que edita trabalha no próprio funil — mexer no funil do seed
 * deixaria o teste seguinte contando telas que o anterior criou.
 *
 * Depende do seed: pnpm db:seed
 */

const ESPERA_LENTA = { timeout: 45_000 };

test.describe("canvas de fluxo", () => {
  test.setTimeout(150_000);

  test("ramificar por resposta cria uma tela por opção e as regras", async ({ page }) => {
    await entrar(page);
    await criarFunil(page, `Ramificar ${Date.now()}`);

    // Uma pergunta com duas opções, que é o que a ramificação consome.
    await abrirPaleta(page);
    await page.getByRole("button", { name: "Opções", exact: true }).click();
    await expect(page.locator(".ed-canvas-frame")).toContainText("Primeira opção");

    await page.getByRole("button", { name: "Fluxo" }).click();
    await expect(page.locator(".fl-node")).toHaveCount(1, ESPERA_LENTA);

    await page.locator(".fl-node").first().click();
    await page.getByRole("button", { name: /^Ramificar / }).click();

    // A tela original mais uma por opção.
    await expect(page.locator(".fl-node")).toHaveCount(3);
    await expect(page.getByRole("button", { name: /já ramifica/ })).toBeVisible();

    // A aresta mostra a condição com o texto da opção, não com o id.
    await expect(page.getByText('"Primeira opção"').first()).toBeVisible();

    // Ramificar dispara várias operações seguidas (telas, regras, posições) e
    // cada uma reinicia o debounce do autosave; em `next dev` isso passa dos
    // 20s com facilidade.
    await expect(page.locator("header").getByRole("status")).toHaveAttribute(
      "aria-label",
      "Salvo",
      ESPERA_LENTA,
    );
  });

  test("o mapa mostra uma tela por nó", async ({ page }) => {
    await entrar(page);
    await abrirFunil(page, "Vitrine de blocos");
    await page.getByRole("button", { name: "Fluxo" }).click();

    // A vitrine tem 4 telas e não é editada por nenhum teste.
    await expect(page.locator(".fl-node")).toHaveCount(4, ESPERA_LENTA);
    await expect(page.locator(".fl-node", { hasText: "Prova social" })).toBeVisible();
  });

  test("abrir um nó leva para o Construtor naquela tela", async ({ page }) => {
    await entrar(page);
    await abrirFunil(page, "Vitrine de blocos");
    await page.getByRole("button", { name: "Fluxo" }).click();

    await expect(page.locator(".fl-node")).toHaveCount(4, ESPERA_LENTA);
    await page.getByRole("button", { name: 'Abrir "Oferta" no Construtor' }).click();

    await expect(page.locator(".ed-canvas-frame")).toBeVisible();
    await expect(page.locator(".ed-canvas-frame")).toContainText("Plano Premium");
  });
});

async function entrar(page: Page) {
  await page.goto("/entrar");
  await page.getByRole("textbox", { name: "E-mail" }).fill("demo@local.dev");
  await page.getByLabel("Senha").fill("demo12345");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("heading", { name: "Meus funis" })).toBeVisible(ESPERA_LENTA);
}

async function abrirFunil(page: Page, nome: string) {
  await page.getByRole("link", { name: new RegExp(nome) }).click();
  await expect(page.getByRole("button", { name: "Publicar" })).toBeVisible(ESPERA_LENTA);
}

async function criarFunil(page: Page, nome: string) {
  // O funil nasce por modal. O gatilho e o submit têm o mesmo nome acessível,
  // então o segundo precisa ser escopado ao diálogo.
  await page.getByRole("button", { name: "Criar funil" }).click();
  const dialogo = page.getByRole("dialog");
  await dialogo.getByLabel("Nome do funil").fill(nome);
  await dialogo.getByRole("button", { name: "Criar funil" }).click();
  await expect(page.locator(".ed-canvas-frame")).toContainText("Sua promessa aqui", ESPERA_LENTA);
}

async function abrirPaleta(page: Page) {
  const gaveta = page.getByRole("button", { name: "Telas e blocos" });
  if (await gaveta.isVisible()) await gaveta.click();

  await page.getByRole("button", { name: "Elementos" }).click();
}
