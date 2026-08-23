import { expect, test, type Page } from "@playwright/test";

/** Capturas do editor para inspeção visual. Sem asserção de layout. */
test("captura o editor", async ({ page }, testInfo) => {
  test.setTimeout(120_000);

  await page.goto("/entrar");
  await page.getByRole("textbox", { name: "E-mail" }).fill("demo@local.dev");
  await page.getByLabel("Senha").fill("demo12345");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("heading", { name: "Meus funis" })).toBeVisible({ timeout: 45_000 });

  await page.getByRole("link", { name: /Quiz do Metabolismo/ }).click();
  await expect(page.locator(".ed-canvas-frame")).toBeVisible({ timeout: 45_000 });

  const nome = testInfo.project.name;
  const abrir = async (botao: string) => {
    const alvo = page.getByRole("button", { name: botao });
    if (await alvo.isVisible()) await alvo.click();
  };
  /**
   * No celular os painéis viram gaveta com um backdrop que cobre a tela
   * inteira, topbar inclusive — sem fechar antes, qualquer clique no topo
   * acerta o backdrop. No desktop não existe gaveta e isto não faz nada.
   */
  const fecharPainel = async () => {
    const backdrop = page.getByRole("button", { name: "Fechar painel" });
    // Canto superior: o backdrop ocupa a tela toda, mas a gaveta cobre a
    // metade de baixo — clicar no centro acertaria a gaveta.
    if (await backdrop.isVisible()) await backdrop.click({ position: { x: 8, y: 8 } });
  };

  // Tela de pergunta, com bloco selecionado
  await selecionarTela(page, "Objetivo principal");
  await page.locator('.ed-block[data-block-id="blk_opcoes_objetivo"]').click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `screenshots/editor-${nome}-canvas.png` });

  await abrir("Ajustes");
  await page.waitForTimeout(300);
  await page.screenshot({ path: `screenshots/editor-${nome}-inspector.png` });

  await page.getByRole("button", { name: "IA", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Copiloto" })).toBeVisible();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `screenshots/editor-${nome}-copiloto.png` });

  await fecharPainel();
  await page.getByRole("button", { name: "Fluxo" }).click();
  await expect(page.locator(".fl-node").first()).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `screenshots/editor-${nome}-fluxo.png` });
});

async function selecionarTela(page: Page, nome: string) {
  const gaveta = page.getByRole("button", { name: "Telas e blocos" });
  if (await gaveta.isVisible()) await gaveta.click();

  await page.getByRole("button", { name: new RegExp(nome) }).first().click();
}
