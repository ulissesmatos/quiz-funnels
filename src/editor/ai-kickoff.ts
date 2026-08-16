/**
 * Chave do pedido de IA feito no modal de criação de funil, guardado em
 * `sessionStorage` pra atravessar o redirect até o editor. `sessionStorage` e
 * não querystring: o texto pode ser longo, e não devia ficar na URL nem no
 * histórico do navegador.
 */
export const AI_KICKOFF_STORAGE_KEY = "funil:ia-ao-criar";

export type AiPrefill = { texto: string };
