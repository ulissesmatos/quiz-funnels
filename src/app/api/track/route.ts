import { NextResponse } from "next/server";

import { recordTrackEvent } from "@/server/analytics/ingest";
import { TrackEventBody } from "@/server/analytics/schema";

export const runtime = "nodejs";

/**
 * Endpoint público de telemetria — o funil publicado chama isto direto do
 * navegador, sem sessão de app. Diferente de todo outro endpoint do projeto,
 * não passa por `requireOrganization()` de propósito: quem visita `/f/{slug}`
 * nunca está logado.
 *
 * Responde rápido e sempre 202: o cliente dispara via `sendBeacon`, que não
 * lê o corpo da resposta — falhar de forma barulhenta não ajudaria ninguém.
 */
export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({}, { status: 204 });
  }

  const parsed = TrackEventBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({}, { status: 204 });
  }

  const userAgent = request.headers.get("user-agent") ?? undefined;
  const country =
    request.headers.get("x-vercel-ip-country") ??
    request.headers.get("cf-ipcountry") ??
    undefined;

  await recordTrackEvent(parsed.data, { userAgent, country });

  return NextResponse.json({ ok: true }, { status: 202 });
}
