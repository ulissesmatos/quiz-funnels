"use client";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
    ttq?: { track?: (...args: unknown[]) => void };
    lintrk?: (...args: unknown[]) => void;
  }
}

/**
 * Cada disparo checa se a função existe antes de chamar — bloqueador de
 * anúncios remove `fbq`/`gtag` com frequência, e isso não pode quebrar o
 * funil pra quem os usa.
 */
export function fireMetaConversion(eventName: string): void {
  if (typeof window === "undefined" || typeof window.fbq !== "function") return;
  window.fbq("track", eventName);
}

export function fireGoogleAdsConversion(googleAdsId: string | undefined, eventName: string | undefined): void {
  if (typeof window === "undefined" || typeof window.gtag !== "function" || !googleAdsId) return;
  window.gtag("event", eventName || "conversion", { send_to: googleAdsId });
}

export function fireGtmEvent(name: string, data?: Record<string, unknown>): void {
  if (typeof window === "undefined" || !Array.isArray(window.dataLayer)) return;
  window.dataLayer.push({ event: name, ...data });
}

export function fireTiktokConversion(eventName: string): void {
  if (typeof window === "undefined" || typeof window.ttq?.track !== "function") return;
  window.ttq.track(eventName);
}

export function fireLinkedinConversion(conversionId: string | undefined): void {
  if (typeof window === "undefined" || typeof window.lintrk !== "function" || !conversionId) return;
  window.lintrk("track", { conversion_id: Number(conversionId) });
}
