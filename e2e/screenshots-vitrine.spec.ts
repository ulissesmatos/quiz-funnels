import { expect, test } from "@playwright/test";

/** Captura cada tela da vitrine, para inspeção visual dos blocos novos. */
test("captura a vitrine de blocos", async ({ page }, testInfo) => {
  const nome = testInfo.project.name;

  await page.goto("/f/vitrine");

  const telas = ["prova", "dados", "midia", "oferta"];

  for (const [index, tela] of telas.entries()) {
    await expect(page.locator(".fn-step")).toBeVisible();
    // Espera as animações de entrada e o carrossel assentarem.
    await page.waitForTimeout(1600);
    await page.screenshot({ path: `screenshots/vitrine-${nome}-${index + 1}-${tela}.png`, fullPage: true });

    if (index < telas.length - 1) {
      await page.getByRole("button", { name: /^Ver / }).click();
    }
  }
});
