"use client";

import type { TrackEventBody } from "@/server/analytics/schema";

const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid", "fbclid"];

/**
 * Uma sessão por funil por aba. Chaveada por `funnelId` (não global) para não
 * misturar a sessão de um funil com a de outro aberto na mesma aba; um
 * refresh no meio do percurso reaproveita o mesmo id em vez de abrir sessão
 * nova.
 */
export function getOrCreateSessionId(funnelId: string): string {
  if (typeof window === "undefined") return crypto.randomUUID();

  const key = `qf:session:${funnelId}`;
  const existing = window.sessionStorage.getItem(key);
  if (existing) return existing;

  const id = crypto.randomUUID();
  window.sessionStorage.setItem(key, id);
  return id;
}

export function parseUtm(): Record<string, string> {
  if (typeof window === "undefined") return {};

  const params = new URLSearchParams(window.location.search);
  const utm: Record<string, string> = {};
  for (const key of UTM_KEYS) {
    const value = params.get(key);
    if (value) utm[key] = value;
  }
  return utm;
}

/**
 * Prefere `sendBeacon`: continua a chamada mesmo quando a página está saindo
 * (clique num CTA externo navega imediatamente), o que `fetch` comum perderia.
 */
export function sendTrackEvent(body: TrackEventBody): void {
  if (typeof navigator === "undefined") return;

  const payload = JSON.stringify(body);

  if (navigator.sendBeacon?.("/api/track", new Blob([payload], { type: "application/json" }))) {
    return;
  }

  fetch("/api/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
    keepalive: true,
  }).catch(() => {});
}

/**
 * Fila serializada por instância: garante que eventos disparados em sequência
 * (view -> step_view inicial -> respostas -> complete) saem na mesma ordem em
 * que aconteceram, mesmo se chamados em rajada.
 */
export function createTrackQueue(): (body: TrackEventBody) => void {
  let queue: Promise<void> = Promise.resolve();

  return (body: TrackEventBody) => {
    queue = queue.then(() => sendTrackEvent(body));
  };
}
