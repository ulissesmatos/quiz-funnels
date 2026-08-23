import { NextResponse } from "next/server";

import { env } from "@/lib/env";
import { encryptSecret } from "@/server/crypto/secret-box";
import { db } from "@/server/db";
import { mercadoPagoConnections } from "@/server/db/schema";
import { readConnectState } from "@/server/mercadopago/state";

export const runtime = "nodejs";

type TokenResponse = {
  access_token: string;
  refresh_token: string;
  public_key: string;
  user_id: number;
  live_mode: boolean;
  expires_in: number;
};

/**
 * Volta da tela de autorização da Mercado Pago. `state` prova de onde veio o
 * pedido (ver `server/mercadopago/state.ts`) — sem sessão nem tabela
 * intermediária, o `organizationId` já vem embutido nele.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const settingsUrl = new URL("/configuracoes", env().BETTER_AUTH_URL);

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (url.searchParams.get("error") || !code || !state) {
    settingsUrl.searchParams.set("mp_erro", "cancelado");
    return NextResponse.redirect(settingsUrl);
  }

  const parsedState = readConnectState(state);
  if (!parsedState) {
    settingsUrl.searchParams.set("mp_erro", "estado_invalido");
    return NextResponse.redirect(settingsUrl);
  }

  const { MERCADOPAGO_APP_ID, MERCADOPAGO_CLIENT_SECRET } = env();
  if (!MERCADOPAGO_APP_ID || !MERCADOPAGO_CLIENT_SECRET) {
    settingsUrl.searchParams.set("mp_erro", "nao_configurado");
    return NextResponse.redirect(settingsUrl);
  }

  const tokenResponse = await fetch("https://api.mercadopago.com/oauth/token", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      client_id: MERCADOPAGO_APP_ID,
      client_secret: MERCADOPAGO_CLIENT_SECRET,
      grant_type: "authorization_code",
      code,
      redirect_uri: `${env().BETTER_AUTH_URL}/api/mercadopago/callback`,
    }),
  });

  if (!tokenResponse.ok) {
    settingsUrl.searchParams.set("mp_erro", "falha_na_troca");
    return NextResponse.redirect(settingsUrl);
  }

  const tokens = (await tokenResponse.json()) as TokenResponse;
  const accessToken = encryptSecret(tokens.access_token);
  const refreshToken = encryptSecret(tokens.refresh_token);

  await db
    .insert(mercadoPagoConnections)
    .values({
      organizationId: parsedState.organizationId,
      mpUserId: String(tokens.user_id),
      accessToken,
      refreshToken,
      publicKey: tokens.public_key,
      liveMode: tokens.live_mode,
      expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
    })
    .onConflictDoUpdate({
      target: mercadoPagoConnections.organizationId,
      set: {
        mpUserId: String(tokens.user_id),
        accessToken,
        refreshToken,
        publicKey: tokens.public_key,
        liveMode: tokens.live_mode,
        expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        connectedAt: new Date(),
      },
    });

  settingsUrl.searchParams.set("mp_conectado", "1");
  return NextResponse.redirect(settingsUrl);
}
