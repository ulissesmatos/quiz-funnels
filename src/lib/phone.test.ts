import { describe, expect, it } from "vitest";

import { formatBrPhone, isValidBrPhone } from "./phone";

describe("formatBrPhone", () => {
  it("formata progressivamente enquanto digita", () => {
    expect(formatBrPhone("1")).toBe("(1");
    expect(formatBrPhone("11")).toBe("(11");
    expect(formatBrPhone("1198")).toBe("(11) 98");
    expect(formatBrPhone("11912345678")).toBe("(11) 91234-5678");
  });

  it("formata fixo (10 dígitos) sem o 9 extra", () => {
    expect(formatBrPhone("1132654321")).toBe("(11) 3265-4321");
  });

  it("ignora caracteres não numéricos e corta no 11º dígito", () => {
    expect(formatBrPhone("(11) 91234-5678 ramal 9")).toBe("(11) 91234-5678");
  });

  it("string vazia continua vazia", () => {
    expect(formatBrPhone("")).toBe("");
  });
});

describe("isValidBrPhone", () => {
  it("aceita 10 (fixo) ou 11 (celular) dígitos", () => {
    expect(isValidBrPhone("(11) 3265-4321")).toBe(true);
    expect(isValidBrPhone("(11) 91234-5678")).toBe(true);
  });

  it("recusa número incompleto", () => {
    expect(isValidBrPhone("(11) 1234")).toBe(false);
    expect(isValidBrPhone("")).toBe(false);
  });
});
