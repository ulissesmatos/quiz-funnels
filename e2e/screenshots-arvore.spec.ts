import { expect, test, type Page } from "@playwright/test";

/**
 * Captura o fluxo de um funil ramificado — é o desenho que deve ler como
 * árvore, com um galho por resposta.
 */
test("captura o fluxo ramificado", async ({ page }, testInfo) => {
  test.setTimeout(150_000);

  await entrar(page);
  await criarFunil(page, `Arvore ${Date.now()}`);

  // Uma pergunta com opções, para haver o que ramificar.
  await abrirPaleta(page);
  await page.getByRole("button", { name: "Opções", exact: true }).click();
  await expect(page.locator(".ed-canvas-frame")).toContainText("Primeira opção");

  await page.getByRole("button", { name: "Fluxo" }).click();
  await expect(page.locator(".fl-node")).toHaveCount(1, { timeout: 45_000 });

  await page.locator(".fl-node").first().click();
  await page.getByRole("button", { name: /^Ramificar / }).click();
  await expect(page.locator(".fl-node")).toHaveCount(3);

  await page.getByRole("button", { name: "Reorganizar" }).click();
  await page.waitForTimeout(1200);

  await page.screenshot({ path: `screenshots/fluxo-${testInfo.project.name}-arvore.png` });
});

async function entrar(page: Page) {
  await page.goto("/entrar");
  await page.getByRole("textbox", { name: "E-mail" }).fill("demo@local.dev");
  await page.getByLabel("Senha").fill("demo12345");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("heading", { name: "Meus funis" })).toBeVisible({ timeout: 45_000 });
}

async function criarFunil(page: Page, nome: string) {
  // O funil nasce por modal. O gatilho e o submit têm o mesmo nome acessível,
  // então o segundo precisa ser escopado ao diálogo.
  await page.getByRole("button", { name: "Criar funil" }).click();
  const dialogo = page.getByRole("dialog");
  await dialogo.getByLabel("Nome do funil").fill(nome);
  await dialogo.getByRole("button", { name: "Criar funil" }).click();
  await expect(page.locator(".ed-canvas-frame")).toContainText("Sua promessa aqui", {
    timeout: 45_000,
  });
}

async function abrirPaleta(page: Page) {
  const gaveta = page.getByRole("button", { name: "Telas e blocos" });
  if (await gaveta.isVisible()) await gaveta.click();
  await page.getByRole("button", { name: "Elementos" }).click();
}
