import { expect, test } from "@playwright/test";

/**
 * Captura telas do funil de exemplo para inspeção visual.
 * Não faz asserção de layout — serve para olhar o resultado.
 *
 * Rodar só isto: pnpm exec playwright test screenshots --project=mobile
 */
test("captura as telas do funil", async ({ page }, testInfo) => {
  const shot = async (nome: string) => {
    await page.screenshot({ path: `screenshots/${testInfo.project.name}-${nome}.png` });
  };

  await page.goto("/f/metabolismo");
  await shot("01-abertura");

  await page.getByRole("button", { name: /Começar agora/ }).click();
  await page.waitForTimeout(500);
  await shot("02-pergunta");

  await page.getByRole("radio", { name: /Perder peso/ }).click();
  await page.getByRole("radio", { name: /50 anos ou mais/ }).click();
  await page.waitForTimeout(400);
  await shot("03-grid");

  await page.getByRole("radio", { name: /Passo o dia sentado/ }).click();
  await page.waitForTimeout(800);
  await shot("04-prova-social");

  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("radio", { name: /Exausto/ }).click();
  await page.getByRole("checkbox", { name: /Pulo refeições/ }).click();
  await page.waitForTimeout(300);
  await shot("05-multipla-escolha");

  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("textbox").fill("Ana");
  await page.getByRole("button", { name: /Ver meu diagnóstico/ }).click();
  await page.waitForTimeout(1800);
  await shot("06-carregando");

  await expect(page.getByRole("heading", { level: 1 })).toContainText("Pronto, Ana!", {
    timeout: 15_000,
  });
  await page.waitForTimeout(400);
  await shot("07-resultado");
});
