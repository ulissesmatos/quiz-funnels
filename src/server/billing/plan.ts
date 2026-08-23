/**
 * Plano único do SaaS — MVP sem tiers. Ajustar aqui muda o preço/trial em
 * produção; não é dado de banco porque só existe UM plano hoje (ver decisão
 * na Parte 5 do roadmap: múltiplos planos ficam pra quando houver sinal real
 * de demanda por diferenciação de preço).
 */
export const PLAN = {
  name: "FunilQuiz Pro",
  priceCents: 9700,
  currency: "BRL",
  trialDays: 7,
  frequency: 1,
  frequencyType: "months" as const,
};
