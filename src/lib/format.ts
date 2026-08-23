/**
 * Formatação de data e valor. Havia 8 cópias privadas de `formatarData`, cada
 * uma com opções de `Intl` ligeiramente diferentes — a mesma data aparecia em
 * três formatos dependendo da tela.
 *
 * Os formatadores são criados uma vez: `Intl.DateTimeFormat` é caro de
 * instanciar e as listas chamam isto por linha.
 */
const DATA_CURTA = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" });
const DATA_COMPLETA = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
const DATA_HORA = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

/** "23 de ago." — para listas onde o ano é sempre o corrente. */
export function formatarData(data: Date | string): string {
  return DATA_CURTA.format(new Date(data));
}

/** "23 de ago. de 2026" — para datas de cobrança e auditoria, onde o ano importa. */
export function formatarDataCompleta(data: Date | string): string {
  return DATA_COMPLETA.format(new Date(data));
}

/** "23 de ago., 14:32" — para logs de erro e eventos. */
export function formatarDataHora(data: Date | string): string {
  return DATA_HORA.format(new Date(data));
}

/** Centavos → "R$ 97,00". O app guarda dinheiro em centavos inteiros, sempre. */
export function formatarPreco(centavos: number, moeda = "BRL"): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: moeda }).format(centavos / 100);
}
