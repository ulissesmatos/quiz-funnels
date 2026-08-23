import "server-only";

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import { env } from "@/lib/env";

/**
 * Estado assinado do fluxo OAuth do Mercado Pago.
 *
 * Não usa tabela nem sessão: o `organizationId` viaja embutido no próprio
 * `state`, assinado com o mesmo segredo que o Better Auth já usa pra cookie —
 * ninguém fora do servidor consegue forjar um válido, e o prazo de 10 minutos
 * casa com a validade do `code` que a Mercado Pago devolve.
 */
const TTL_MS = 10 * 60 * 1000;

export function createConnectState(organizationId: string): string {
  const payload = JSON.stringify({
    organizationId,
    nonce: randomBytes(8).toString("hex"),
    exp: Date.now() + TTL_MS,
  });
  const encoded = Buffer.from(payload).toString("base64url");
  return `${encoded}.${sign(encoded)}`;
}

export function readConnectState(state: string): { organizationId: string } | null {
  const [encoded, signature] = state.split(".");
  if (!encoded || !signature) return null;
  if (!signaturesMatch(sign(encoded), signature)) return null;

  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as {
      organizationId: string;
      exp: number;
    };
    if (typeof payload.exp !== "number" || payload.exp < Date.now()) return null;
    if (typeof payload.organizationId !== "string" || !payload.organizationId) return null;
    return { organizationId: payload.organizationId };
  } catch {
    return null;
  }
}

function sign(value: string): string {
  return createHmac("sha256", env().BETTER_AUTH_SECRET).update(value).digest("hex");
}

function signaturesMatch(expected: string, received: string): boolean {
  const a = Buffer.from(expected);
  const b = Buffer.from(received);
  return a.length === b.length && timingSafeEqual(a, b);
}
