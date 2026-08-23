"use client";

import { useCallback, useEffect, useRef } from "react";

import type { AnswerValue } from "@/funnel/logic/context";
import type { FunnelDocument, FunnelPixels } from "@/funnel/schema";
import type { BlockAction } from "@/funnel/schema/common";
import type { TrackEventBody } from "@/server/analytics/schema";

import { FunnelView, type FunnelCompletion } from "./funnel-view";
import {
  fireGoogleAdsConversion,
  fireGtmEvent,
  fireLinkedinConversion,
  fireMetaConversion,
  fireTiktokConversion,
} from "./pixel-events";
import { PixelScripts } from "./pixel-scripts";
import { createTrackQueue, getOrCreateSessionId, parseUtm } from "./tracking-client";

/** Digitação não vira 1 request por tecla — só quando a pessoa para de digitar. */
const ANSWER_DEBOUNCE_MS = 700;

type TrackEnvelope = Omit<TrackEventBody, "funnelId" | "funnelVersionId" | "sessionId">;

/**
 * Envolve `FunnelView` com telemetria: dono da sessão do visitante, dispara
 * os eventos de `/api/track` nos pontos certos e injeta os pixels do funil.
 * É o que a página pública renderiza — `FunnelView` sozinho não sabe nada de
 * analytics.
 */
export function TrackedFunnelView({
  document: doc,
  funnelId,
  funnelVersionId,
  searchParams,
  mercadoPagoPublicKey,
}: {
  document: FunnelDocument;
  funnelId: string;
  funnelVersionId: string;
  searchParams?: Record<string, string | string[] | undefined>;
  /** Ausente quando a organização não conectou o Mercado Pago — o bloco de Checkout mostra um aviso. */
  mercadoPagoPublicKey?: string;
}) {
  const firstStepId = doc.steps[0]?.id ?? "";

  const sessionIdRef = useRef("");
  const currentStepIdRef = useRef(firstStepId);
  const convertedRef = useRef(false);
  const enqueueRef = useRef<((body: TrackEventBody) => void) | null>(null);
  const pendingAnswersRef = useRef(
    new Map<string, { value: AnswerValue; timer: ReturnType<typeof setTimeout> }>(),
  );

  const enqueue = useCallback(
    (envelope: TrackEnvelope) => {
      enqueueRef.current?.({
        funnelId,
        funnelVersionId,
        sessionId: sessionIdRef.current,
        ...envelope,
      } as TrackEventBody);
    },
    [funnelId, funnelVersionId],
  );

  const flushPendingAnswers = useCallback(() => {
    for (const [name, pending] of pendingAnswersRef.current) {
      clearTimeout(pending.timer);
      enqueue({ type: "answer", stepId: currentStepIdRef.current, answer: { name, value: pending.value } });
    }
    pendingAnswersRef.current.clear();
  }, [enqueue]);

  useEffect(() => {
    sessionIdRef.current = getOrCreateSessionId(funnelId);
    enqueueRef.current = createTrackQueue();

    // `goTo` nunca roda para o step inicial (o histórico já nasce com ele),
    // então o `step_view` da primeira tela precisa ser sintetizado aqui.
    enqueue({ type: "view", stepId: firstStepId, utm: parseUtm(), referrer: document.referrer || undefined });
    enqueue({ type: "step_view", stepId: firstStepId });

    const handlePageHide = () => flushPendingAnswers();
    window.addEventListener("pagehide", handlePageHide);
    return () => window.removeEventListener("pagehide", handlePageHide);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStepChange = useCallback(
    (stepId: string) => {
      flushPendingAnswers();
      currentStepIdRef.current = stepId;
      enqueue({ type: "step_view", stepId });
    },
    [enqueue, flushPendingAnswers],
  );

  const handleAnswer = useCallback(
    (name: string, value: AnswerValue) => {
      const pending = pendingAnswersRef.current.get(name);
      if (pending) clearTimeout(pending.timer);

      const timer = setTimeout(() => {
        pendingAnswersRef.current.delete(name);
        enqueue({ type: "answer", stepId: currentStepIdRef.current, answer: { name, value } });
      }, ANSWER_DEBOUNCE_MS);

      pendingAnswersRef.current.set(name, { value, timer });
    },
    [enqueue],
  );

  /**
   * Conversão = `complete` OU o primeiro clique de saída (link/WhatsApp), o
   * que vier primeiro. Muitos funis terminam num CTA externo (checkout,
   * WhatsApp) sem nunca passar por um step de `submit` interno — travar a
   * conversão só no `complete` perderia esses casos.
   */
  const markConverted = useCallback(
    (pixels: FunnelPixels) => {
      if (convertedRef.current) return;
      convertedRef.current = true;

      fireMetaConversion(pixels.conversionEventName || "Lead");
      fireGoogleAdsConversion(pixels.googleAdsId, pixels.conversionEventName);
      fireTiktokConversion(pixels.conversionEventName || "Lead");
      fireLinkedinConversion(pixels.linkedinConversionId);
      fireGtmEvent("funnel_conversion", { funnelId });
    },
    [funnelId],
  );

  const handleComplete = useCallback(
    ({ scores, endStepId }: FunnelCompletion) => {
      flushPendingAnswers();
      enqueue({ type: "complete", stepId: endStepId, complete: { scores, outcomeId: endStepId } });
      markConverted(doc.settings.pixels);
    },
    [doc.settings.pixels, enqueue, flushPendingAnswers, markConverted],
  );

  const handleExternalAction = useCallback(
    (action: Extract<BlockAction, { kind: "link" | "whatsapp" }>) => {
      flushPendingAnswers();
      enqueue({
        type: "click",
        stepId: currentStepIdRef.current,
        click: { kind: action.kind, url: action.kind === "link" ? action.url : undefined },
      });
      markConverted(doc.settings.pixels);
    },
    [doc.settings.pixels, enqueue, flushPendingAnswers, markConverted],
  );

  return (
    <>
      <PixelScripts pixels={doc.settings.pixels} />
      <FunnelView
        document={doc}
        searchParams={searchParams}
        onStepChange={handleStepChange}
        onAnswer={handleAnswer}
        onComplete={handleComplete}
        onExternalAction={handleExternalAction}
        tracking={{ funnelId, sessionId: () => sessionIdRef.current }}
        mercadoPagoPublicKey={mercadoPagoPublicKey}
      />
    </>
  );
}
