import "server-only";

import { createHmac } from "node:crypto";

import { and, eq, isNull, or } from "drizzle-orm";

import { db } from "@/server/db";
import { funnels, responseSessions, webhookSubscriptions } from "@/server/db/schema";

import type { TrackEventBody } from "../analytics/schema";

const MAX_ATTEMPTS = 3;
const RETRY_DELAYS_MS = [1000, 3000];
const REQUEST_TIMEOUT_MS = 8000;

/**
 * Dispara os webhooks ativos do funil quando alguém completa o funil.
 *
 * Roda depois que `recordTrackEvent` já gravou a sessão (ver `ingest.ts`), e
 * por isso lê `responseSessions` para pegar as respostas acumuladas até
 * aqui — o corpo do evento `complete` sozinho só carrega score e outcome, não
 * o formulário inteiro.
 *
 * Nunca é aguardado pelo endpoint público (`/api/track`): dispara e segue,
 * envolto no mesmo try/catch silencioso que o resto do pipeline de telemetria
 * já usa. Isso só funciona porque o processo Node deste projeto é de vida
 * longa (self-hosted via docker-compose, não serverless/edge) — numa função
 * de vida curta isto precisaria de uma fila de verdade em vez de um disparo
 * solto.
 */
export async function dispatchWebhooks(body: TrackEventBody): Promise<void> {
  if (body.type !== "complete") return;

  const [funnel] = await db
    .select({ organizationId: funnels.organizationId })
    .from(funnels)
    .where(eq(funnels.id, body.funnelId))
    .limit(1);
  if (!funnel) return;

  const subscriptions = await db
    .select({ url: webhookSubscriptions.url, secret: webhookSubscriptions.secret })
    .from(webhookSubscriptions)
    .where(
      and(
        eq(webhookSubscriptions.organizationId, funnel.organizationId),
        eq(webhookSubscriptions.active, true),
        or(isNull(webhookSubscriptions.funnelId), eq(webhookSubscriptions.funnelId, body.funnelId)),
      ),
    );

  if (subscriptions.length === 0) return;

  const [session] = await db
    .select({
      answers: responseSessions.answers,
      scores: responseSessions.scores,
      outcomeId: responseSessions.outcomeId,
      completedAt: responseSessions.completedAt,
    })
    .from(responseSessions)
    .where(eq(responseSessions.id, body.sessionId))
    .limit(1);

  const payloadJson = JSON.stringify({
    event: "funnel.completed",
    funnelId: body.funnelId,
    sessionId: body.sessionId,
    answers: session?.answers ?? {},
    scores: session?.scores ?? {},
    outcomeId: session?.outcomeId ?? null,
    completedAt: session?.completedAt ?? new Date(),
  });

  await Promise.all(subscriptions.map((sub) => sendWithRetry(sub.url, sub.secret, payloadJson)));
}

/**
 * Assinatura no formato `sha256=<hex>` — mesma convenção do GitHub, a mais
 * reconhecida entre quem já integrou algum webhook antes.
 */
function sign(secret: string, payloadJson: string): string {
  return `sha256=${createHmac("sha256", secret).update(payloadJson).digest("hex")}`;
}

async function sendWithRetry(url: string, secret: string, payloadJson: string): Promise<void> {
  const signature = sign(secret, payloadJson);

  for (let tentativa = 0; tentativa < MAX_ATTEMPTS; tentativa++) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json", "x-funilquiz-signature": signature },
        body: payloadJson,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (response.ok) return;
    } catch {
      // Rede fora do ar, timeout, DNS — tenta de novo até esgotar as tentativas.
    }

    const espera = RETRY_DELAYS_MS[tentativa];
    if (espera) await new Promise((resolve) => setTimeout(resolve, espera));
  }
}
