import { describe, expect, it } from "vitest";

import { interpolate } from "./interpolate";
import { createContext } from "./context";
import { metabolismoTemplate } from "../templates/metabolismo";

const base = metabolismoTemplate;

describe("rótulo de resposta na interpolação", () => {
  it("{{campo}} mostra o rótulo da opção, não o id gravado", () => {
    const context = { ...createContext(base), answers: { objetivo: "perder_peso" } };

    expect(interpolate("Seu objetivo é {{objetivo}}", context)).toBe("Seu objetivo é Perder peso");
  });

  it("resposta de múltipla escolha vira uma lista de rótulos", () => {
    const context = {
      ...createContext(base),
      answers: { objetivo: ["perder_peso", "ganhar_massa"] },
    };

    expect(interpolate("{{objetivo}}", context)).toBe("Perder peso, Ganhar massa muscular");
  });

  it("campo de texto livre (input) continua mostrando o valor digitado", () => {
    const context = { ...createContext(base), answers: { nome: "Marina" } };
    expect(interpolate("Oi, {{nome}}", context)).toBe("Oi, Marina");
  });

  it("id de opção que não existe mais cai para o valor cru, sem quebrar", () => {
    const context = { ...createContext(base), answers: { objetivo: "opcao_removida" } };
    expect(interpolate("{{objetivo}}", context)).toBe("opcao_removida");
  });
});
