import "server-only";

/**
 * Limitador em memória, janela fixa. Suficiente porque o app roda como um
 * único processo Node de longa duração (self-hosted, não serverless — ver
 * comentário em `api/ai/chat/route.ts`); não precisa de Redis pra isso.
 *
 * O login/cadastro já tem limite próprio, embutido no Better Auth
 * (`rateLimit.enabled` liga sozinho em produção — ver
 * `node_modules/better-auth/dist/context/create-context.mjs`). Este módulo
 * cobre só as rotas fora do plugin de auth: checkout público e o copiloto de IA.
 */
type Registro = { count: number; expiresAt: number };

const registros = new Map<string, Registro>();

// Evita o Map crescer pra sempre num processo de longa duração.
setInterval(
  () => {
    const agora = Date.now();
    for (const [chave, registro] of registros) {
      if (registro.expiresAt <= agora) registros.delete(chave);
    }
  },
  5 * 60 * 1000,
).unref();

export type RateLimitResult = { ok: true } | { ok: false; retryAfterSeconds: number };

/**
 * @param key Identifica quem está sendo limitado (IP, organizationId, etc.) —
 * já prefixado por chamada (ex.: `checkout:${ip}`) pra não colidir entre rotas.
 */
export function checkRateLimit(key: string, { windowSeconds, max }: { windowSeconds: number; max: number }): RateLimitResult {
  const agora = Date.now();
  const registro = registros.get(key);

  if (!registro || registro.expiresAt <= agora) {
    registros.set(key, { count: 1, expiresAt: agora + windowSeconds * 1000 });
    return { ok: true };
  }

  if (registro.count >= max) {
    return { ok: false, retryAfterSeconds: Math.ceil((registro.expiresAt - agora) / 1000) };
  }

  registro.count++;
  return { ok: true };
}

/** IP do visitante a partir dos headers de proxy reverso — nunca de `request.ip` (não existe mais no Node runtime). */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") ?? "desconhecido";
}
