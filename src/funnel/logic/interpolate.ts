import { lookupValue, type FunnelContext } from "./context";

const TOKEN = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_.]*)\s*\}\}/g;

/**
 * Troca `{{nome}}` pelo valor correspondente no contexto.
 * Token desconhecido vira string vazia — nunca deixamos `{{algo}}` aparecer
 * cru para o visitante.
 */
export function interpolate(text: string, context: FunnelContext): string {
  // `text` só é `string` no tipo — na prática pode vir de props de bloco
  // salvas com um valor errado (ex.: um item de lista que devia ser string e
  // virou objeto). Sem essa guarda, isso derruba a tela inteira do editor em
  // vez de só deixar aquele texto em branco.
  if (typeof text !== "string") return "";
  if (!text.includes("{{")) return text;
  return text.replace(TOKEN, (_match, key: string) => lookupValue(context, key));
}

/** Nomes de variáveis citados num texto — usado pelo editor para avisar sobre tokens quebrados. */
export function extractTokens(text: string): string[] {
  return [...text.matchAll(TOKEN)].map((m) => m[1]);
}
