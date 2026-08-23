import { describe, expect, it } from "vitest";

import { classifyTrafficSource } from "./traffic-source";

describe("classifyTrafficSource", () => {
  it("sem utm e sem referrer é acesso direto", () => {
    expect(classifyTrafficSource(null, null)).toBe("direto");
    expect(classifyTrafficSource({}, "")).toBe("direto");
  });

  it("utm_medium de anúncio é tráfego pago", () => {
    expect(classifyTrafficSource({ utm_medium: "cpc" }, null)).toBe("pago");
    expect(classifyTrafficSource({ utm_medium: "paid-social" }, null)).toBe("pago");
  });

  it("gclid ou fbclid é pago mesmo sem utm_medium", () => {
    expect(classifyTrafficSource({ gclid: "abc" }, null)).toBe("pago");
    expect(classifyTrafficSource({ fbclid: "abc" }, null)).toBe("pago");
  });

  it("utm_source sem sinal de pago é campanha", () => {
    expect(classifyTrafficSource({ utm_source: "newsletter" }, null)).toBe("campanha");
  });

  it("referrer de busca conhecida é orgânico", () => {
    expect(classifyTrafficSource(null, "https://www.google.com/search?q=x")).toBe("busca_organica");
  });

  it("referrer de rede social conhecida é social", () => {
    expect(classifyTrafficSource(null, "https://www.instagram.com/")).toBe("social");
  });

  it("referrer desconhecido cai em 'outros sites'", () => {
    expect(classifyTrafficSource(null, "https://blog-de-alguem.com/post")).toBe("referencia");
  });

  it("referrer inválido não quebra e cai em direto", () => {
    expect(classifyTrafficSource(null, "não é uma url")).toBe("direto");
  });
});
