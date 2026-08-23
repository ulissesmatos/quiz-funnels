import "server-only";

import { db } from "@/server/db";
import { errorLogs } from "@/server/db/schema";

/**
 * Grava no banco pra alimentar o painel `/admin` — ver decisão na Parte 5
 * (tabela própria em vez de Sentry, o deploy é self-hosted). Chamado nos
 * pontos onde dinheiro de verdade passa e um erro silencioso seria pior que
 * ruído a mais: rotas de pagamento e o webhook. Nunca propaga: logar a falha
 * não pode derrubar o fluxo que já estava falhando.
 */
export async function logServerError(source: string, error: unknown, context?: Record<string, unknown>) {
  try {
    await db.insert(errorLogs).values({
      source,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? (error.stack ?? null) : null,
      context: context ?? {},
    });
  } catch {
    // Ver comentário acima — de propósito.
  }
}
