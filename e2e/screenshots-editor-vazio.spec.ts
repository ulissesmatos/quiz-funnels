import { expect, test } from "@playwright/test";

/**
 * Editor na tela de oferta da vitrine, que tem um bloco de confetti — o caso
 * que motivou o marcador de bloco sem nada visível.
 */
test("captura o editor com bloco invisível", async ({ page }, testInfo) => {
  test.setTimeout(120_000);

  await page.goto("/entrar");
  await page.getByRole("textbox", { name: "E-mail" }).fill("demo@local.dev");
  await page.getByLabel("Senha").fill("demo12345");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("heading", { name: "Meus funis" })).toBeVisible({ timeout: 45_000 });

  await page.getByRole("link", { name: /Vitrine de blocos/ }).click();
  await expect(page.locator(".ed-canvas-frame")).toBeVisible({ timeout: 45_000 });

  await page.getByRole("button", { name: /Oferta/ }).first().click();
  await expect(page.locator(".ed-vazio")).toBeVisible();
  await page.waitForTimeout(600);

  await page.screenshot({ path: `screenshots/editor-${testInfo.project.name}-vazio.png` });

  // E a paleta, agora numa aba própria.
  await page.getByRole("button", { name: "Elementos" }).click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `screenshots/editor-${testInfo.project.name}-elementos.png` });
});
