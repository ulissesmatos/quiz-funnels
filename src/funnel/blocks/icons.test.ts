import { icons } from "lucide-react";
import { describe, expect, it } from "vitest";

import { stepTypeMeta } from "../schema/step";
import { allBlockDefinitions } from "../schema/block";

/**
 * Ícone com nome errado não quebra nada — simplesmente não aparece, e só se
 * descobre olhando a tela. Como os nomes ficam guardados como texto nas
 * definições, este teste é o que garante que todos existem de verdade.
 */
describe("ícones do registro", () => {
  it("todo bloco aponta para um ícone que existe no lucide", () => {
    for (const definition of allBlockDefinitions) {
      expect(icons[definition.icon as keyof typeof icons], `bloco "${definition.type}" usa "${definition.icon}"`).toBeDefined();
    }
  });

  it("todo tipo de tela aponta para um ícone que existe no lucide", () => {
    for (const [tipo, meta] of Object.entries(stepTypeMeta)) {
      expect(icons[meta.icon as keyof typeof icons], `tela "${tipo}" usa "${meta.icon}"`).toBeDefined();
    }
  });
});
