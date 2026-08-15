import { describe, expect, it } from "vitest";

import { slugify, slugifyId, uniqueId } from "./slug";

describe("slugify", () => {
  it("remove acentos e normaliza para URL", () => {
    expect(slugify("Funil de Emagrecimento Rápido!")).toBe("funil-de-emagrecimento-rapido");
    expect(slugify("Você está pronto?")).toBe("voce-esta-pronto");
    expect(slugify("  Ação   &   Reação  ")).toBe("acao-reacao");
  });
});

describe("slugifyId", () => {
  it("gera identificadores aceitos por SlugId", () => {
    expect(slugifyId("Qual seu objetivo?")).toBe("qual_seu_objetivo");
    expect(slugifyId("Café da manhã")).toBe("cafe_da_manha");
  });

  it("garante que o id comece com letra", () => {
    expect(slugifyId("123 primeiro")).toBe("id_123_primeiro");
  });
});

describe("uniqueId", () => {
  it("mantém o id quando está livre", () => {
    expect(uniqueId("blk_titulo", ["blk_texto"])).toBe("blk_titulo");
  });

  it("acrescenta sufixo quando já existe", () => {
    expect(uniqueId("blk_titulo", ["blk_titulo", "blk_titulo_2"])).toBe("blk_titulo_3");
  });
});
