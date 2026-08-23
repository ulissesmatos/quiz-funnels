import "server-only";

import { sql } from "drizzle-orm";

import { db } from "@/server/db";
import { funnelEvents, responseSessions } from "@/server/db/schema";
import { dispatchWebhooks } from "@/server/webhooks/dispatch";

import type { TrackEventBody } from "./schema";

export type TrackRequestMeta = { userAgent?: string; country?: string };

/**
 * Grava um evento de telemetria: upsert em `responseSessions` (uma linha por
 * visitante) + insert em `funnelEvents` (log bruto, base do funil de
 * abandono). Chamado pelo endpoint público — nunca lança: o cliente dispara
 * via `sendBeacon` e não lê a resposta, então um `funnelId` inválido ou uma
 * corrida de rede não pode virar erro 500 sem quem trate.
 */
export async function recordTrackEvent(body: TrackEventBody, meta: TrackRequestMeta): Promise<void> {
  try {
    await upsertSession(body, meta);

    await db.insert(funnelEvents).values({
      funnelId: body.funnelId,
      sessionId: body.sessionId,
      type: body.type,
      stepId: body.stepId ?? null,
      payload: buildEventPayload(body),
    });

    // Não aguardado de propósito: webhook lento/fora do ar não pode atrasar a
    // resposta deste endpoint. Erros dentro de `dispatchWebhooks` já são
    // tratados por chamada (retry com backoff) — este catch cobre só o que
    // sobrar, para nunca derrubar o try externo por causa de um disparo solto.
    void dispatchWebhooks(body).catch(() => {});
  } catch {
    // Endpoint público sem consumidor da resposta — engolir é a escolha certa.
  }
}

async function upsertSession(body: TrackEventBody, meta: TrackRequestMeta): Promise<void> {
  const patch: Record<string, unknown> = { updatedAt: new Date() };

  switch (body.type) {
    case "view":
      patch.utm = body.utm ?? {};
      patch.referrer = body.referrer ?? null;
      patch.userAgent = meta.userAgent ?? null;
      patch.country = meta.country ?? null;
      if (body.stepId) patch.lastStepId = body.stepId;
      break;
    case "step_view":
      if (body.stepId) patch.lastStepId = body.stepId;
      break;
    case "answer":
      if (body.answer) {
        patch.answers = sql`${responseSessions.answers} || ${JSON.stringify({
          [body.answer.name]: body.answer.value,
        })}::jsonb`;
      }
      if (body.stepId) patch.lastStepId = body.stepId;
      break;
    case "complete":
      patch.completedAt = new Date();
      if (body.complete?.scores) patch.scores = body.complete.scores;
      if (body.complete?.outcomeId) patch.outcomeId = body.complete.outcomeId;
      break;
    case "click":
      break;
  }

  await db
    .insert(responseSessions)
    .values({
      id: body.sessionId,
      funnelId: body.funnelId,
      funnelVersionId: body.funnelVersionId ?? null,
      lastStepId: body.stepId ?? null,
      utm: body.type === "view" ? (body.utm ?? {}) : {},
      referrer: body.type === "view" ? (body.referrer ?? null) : null,
      userAgent: body.type === "view" ? (meta.userAgent ?? null) : null,
      country: body.type === "view" ? (meta.country ?? null) : null,
      answers: body.type === "answer" && body.answer ? { [body.answer.name]: body.answer.value } : {},
      scores: body.type === "complete" ? (body.complete?.scores ?? {}) : {},
      outcomeId: body.type === "complete" ? (body.complete?.outcomeId ?? null) : null,
      completedAt: body.type === "complete" ? new Date() : null,
    })
    .onConflictDoUpdate({ target: responseSessions.id, set: patch });
}

function buildEventPayload(body: TrackEventBody): Record<string, unknown> {
  switch (body.type) {
    case "answer":
      return body.answer ? { name: body.answer.name, value: body.answer.value } : {};
    case "click":
      return body.click ?? {};
    case "complete":
      return body.complete ?? {};
    default:
      return {};
  }
}
