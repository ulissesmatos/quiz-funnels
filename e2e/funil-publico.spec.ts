import { expect, test } from "@playwright/test";

/**
 * Percorre o funil de exemplo do começo ao fim, do jeito que um visitante real
 * faria. Cobre o que o Fase 1 promete: SSR da primeira tela, avanço automático
 * na escolha única, interpolação de variáveis, tela de carregamento com timer e
 * resultado escolhido por pontuação.
 *
 * Depende do seed: pnpm db:seed
 */
test.describe("funil público", () => {
  test("percorre o quiz do metabolismo até a oferta", async ({ page }) => {
    await page.goto("/f/metabolismo");

    // 1. Abertura
    await expect(page.getByRole("heading", { level: 1 })).toContainText("tipo de metabolismo");
    await page.getByRole("button", { name: /Começar agora/ }).click();

    // 2. Objetivo — clicar na opção já avança (autoAdvance)
    await expect(page.getByRole("heading", { level: 1 })).toContainText("principal objetivo");
    await page.getByRole("radio", { name: /Perder peso/ }).click();

    // 3. Faixa etária
    await expect(page.getByRole("heading", { level: 1 })).toContainText("faixa de idade");
    await page.getByRole("radio", { name: /50 anos ou mais/ }).click();

    // 4. Rotina
    await expect(page.getByRole("heading", { level: 1 })).toContainText("rotina de movimento");
    await page.getByRole("radio", { name: /Passo o dia sentado/ }).click();

    // 5. Prova social
    await expect(page.getByRole("heading", { level: 1 })).toContainText("meio do caminho");
    await page.getByRole("button", { name: "Continuar" }).click();

    // 6. Energia
    await expect(page.getByRole("heading", { level: 1 })).toContainText("fim da tarde");
    await page.getByRole("radio", { name: /Exausto/ }).click();

    // 7. Hábitos — múltipla escolha, exige o botão de continuar
    await expect(page.getByRole("heading", { level: 1 })).toContainText("sua alimentação");
    await page.getByRole("checkbox", { name: /Pulo refeições/ }).click();
    await page.getByRole("checkbox", { name: /Como muito tarde/ }).click();
    await page.getByRole("button", { name: "Continuar" }).click();

    // 8. Nome
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Como podemos te chamar");
    await page.getByRole("textbox").fill("Ana");
    await page.getByRole("button", { name: /Ver meu diagnóstico/ }).click();

    // 9. Carregando — o timer soma ~4,5s e avança sozinho
    await expect(page.getByText("Montando seu diagnóstico, Ana")).toBeVisible();
    await expect(page.getByText("Analisando suas respostas")).toBeVisible();

    // 10. Resultado — as respostas somam metabolismo_lento >= 5
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Pronto, Ana!", {
      timeout: 15_000,
    });
    await expect(page.getByText("Metabolismo em modo economia")).toBeVisible();
    await page.getByRole("button", { name: /Quero meu plano completo/ }).click();

    // 11. E-mail — obrigatório e validado
    // O anunciador de rota do Next também é role=alert, por isso o seletor
    // aponta para a classe do erro de campo.
    const erroDoCampo = page.locator(".fn-field-error");

    await expect(page.getByRole("heading", { level: 1 })).toContainText("Para onde enviamos");
    await page.getByRole("button", { name: /Receber meu plano/ }).click();
    await expect(erroDoCampo).toContainText("Preencha este campo");

    await page.getByRole("textbox").fill("nao-e-email");
    await page.getByRole("button", { name: /Receber meu plano/ }).click();
    await expect(erroDoCampo).toContainText("e-mail válido");

    await page.getByRole("textbox").fill("ana@exemplo.com");
    await page.getByRole("button", { name: /Receber meu plano/ }).click();

    // 12. Oferta, com o nome interpolado
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Seu plano está a caminho, Ana");
  });

  test("um perfil diferente leva a um resultado diferente", async ({ page }) => {
    await page.goto("/f/metabolismo");

    await page.getByRole("button", { name: /Começar agora/ }).click();
    await page.getByRole("radio", { name: /Ganhar massa muscular/ }).click();
    await page.getByRole("radio", { name: /Até 29 anos/ }).click();
    await page.getByRole("radio", { name: /Treino quase todo dia/ }).click();
    await page.getByRole("button", { name: "Continuar" }).click();
    await page.getByRole("radio", { name: /Ainda com energia de sobra/ }).click();
    await page.getByRole("checkbox", { name: /Como bastante proteína/ }).click();
    await page.getByRole("button", { name: "Continuar" }).click();
    await page.getByRole("textbox").fill("Bruno");
    await page.getByRole("button", { name: /Ver meu diagnóstico/ }).click();

    await expect(page.getByText("Metabolismo acelerado")).toBeVisible({ timeout: 15_000 });
  });

  test("o HTML já vem com a primeira tela renderizada no servidor", async ({ request }) => {
    const response = await request.get("/f/metabolismo");
    const html = await response.text();

    expect(response.status()).toBe(200);
    // Sem depender de JS: o conteúdo tem que estar no HTML para SEO.
    expect(html).toContain("seu tipo de metabolismo");
    expect(html).toContain("Descubra seu tipo de metabolismo em 2 minutos");
  });

  test("funil inexistente devolve 404", async ({ request }) => {
    const response = await request.get("/f/nao-existe-mesmo");
    expect(response.status()).toBe(404);
  });
});
