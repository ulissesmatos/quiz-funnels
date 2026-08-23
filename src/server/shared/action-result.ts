/** Resultado padrão de server action: toda action do projeto devolve isto. */
export type ActionResult = { ok: true } | { ok: false; error: string };
