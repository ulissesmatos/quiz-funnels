export type TrafficSource = "direto" | "pago" | "busca_organica" | "social" | "campanha" | "referencia";

export const TRAFFIC_SOURCE_LABELS: Record<TrafficSource, string> = {
  direto: "Acesso direto",
  pago: "Tráfego pago",
  busca_organica: "Busca orgânica",
  social: "Redes sociais",
  campanha: "Campanha (UTM)",
  referencia: "Outros sites",
};

const PAID_MEDIUM = /cpc|ppc|paid|display|cpm|remarketing/i;

const SEARCH_HOSTS = ["google.", "bing.", "duckduckgo.", "yahoo.", "baidu.", "yandex."];
const SOCIAL_HOSTS = [
  "facebook.",
  "instagram.",
  "tiktok.",
  "youtube.",
  "linkedin.",
  "twitter.",
  "x.com",
  "pinterest.",
  "threads.",
  "whatsapp.",
];

/**
 * Heurística pragmática: sem um pixel de rastreamento externo, tudo que dá
 * pra saber sobre a origem de uma visita é UTM + referrer. `gclid`/`fbclid`
 * aparecem mesmo quando a campanha esqueceu de marcar `utm_medium`, então
 * contam como sinal de tráfego pago por conta própria.
 */
export function classifyTrafficSource(
  utm: Record<string, string> | null | undefined,
  referrer: string | null | undefined,
): TrafficSource {
  const hasClickId = Boolean(utm?.gclid || utm?.fbclid);
  const medium = utm?.utm_medium;

  if (hasClickId || (medium && PAID_MEDIUM.test(medium))) return "pago";
  if (utm?.utm_source) return "campanha";

  const host = extractHost(referrer);
  if (!host) return "direto";
  if (SEARCH_HOSTS.some((known) => host.includes(known))) return "busca_organica";
  if (SOCIAL_HOSTS.some((known) => host.includes(known))) return "social";
  return "referencia";
}

function extractHost(referrer: string | null | undefined): string | null {
  if (!referrer) return null;
  try {
    return new URL(referrer).hostname.toLowerCase();
  } catch {
    return null;
  }
}
