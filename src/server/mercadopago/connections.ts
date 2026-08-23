import "server-only";

import { eq } from "drizzle-orm";

import { env } from "@/lib/env";
import { decryptSecret, encryptSecret } from "@/server/crypto/secret-box";
import { db } from "@/server/db";
import { funnels, mercadoPagoConnections, type MercadoPagoConnection } from "@/server/db/schema";

/**
 * Único ponto de leitura da tabela: descriptografa access/refresh token aqui
 * pra todo consumidor (`getValidAccessToken` etc.) receber texto plano sem
 * precisar saber que a coluna é cifrada.
 */
export async function getMercadoPagoConnection(organizationId: string): Promise<MercadoPagoConnection | null> {
  const [row] = await db
    .select()
    .from(mercadoPagoConnections)
    .where(eq(mercadoPagoConnections.organizationId, organizationId))
    .limit(1);

  if (!row) return null;
  return { ...row, accessToken: decryptSecret(row.accessToken), refreshToken: decryptSecret(row.refreshToken) };
}

/**
 * Public key pra inicializar o Payment Brick no funil público — chave
 * pública, segura de expor no cliente. Usado pela página pública, que só tem
 * o `funnelId`, não a organização (resolvida aqui via join).
 */
export async function getPublicKeyForFunnel(funnelId: string): Promise<string | null> {
  const [row] = await db
    .select({ publicKey: mercadoPagoConnections.publicKey })
    .from(mercadoPagoConnections)
    .innerJoin(funnels, eq(funnels.organizationId, mercadoPagoConnections.organizationId))
    .where(eq(funnels.id, funnelId))
    .limit(1);

  return row?.publicKey ?? null;
}

/**
 * Renova o token de acesso se estiver perto de vencer (o access_token dura
 * 180 dias, mas conexões antigas não podem simplesmente parar de funcionar).
 * Chamado sempre que vamos usar o token pra criar uma cobrança de verdade —
 * nunca antecipadamente, pra não gastar troca de token à toa.
 */
export async function getValidAccessToken(organizationId: string): Promise<string | null> {
  const connection = await getMercadoPagoConnection(organizationId);
  if (!connection) return null;

  const prestesAVencer = connection.expiresAt.getTime() - Date.now() < 24 * 60 * 60 * 1000;
  if (!prestesAVencer) return connection.accessToken;

  const { MERCADOPAGO_APP_ID, MERCADOPAGO_CLIENT_SECRET } = env();
  if (!MERCADOPAGO_APP_ID || !MERCADOPAGO_CLIENT_SECRET) return connection.accessToken;

  try {
    const response = await fetch("https://api.mercadopago.com/oauth/token", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        client_id: MERCADOPAGO_APP_ID,
        client_secret: MERCADOPAGO_CLIENT_SECRET,
        grant_type: "refresh_token",
        refresh_token: connection.refreshToken,
      }),
    });
    if (!response.ok) return connection.accessToken;

    const tokens = (await response.json()) as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
    };

    await db
      .update(mercadoPagoConnections)
      .set({
        accessToken: encryptSecret(tokens.access_token),
        refreshToken: encryptSecret(tokens.refresh_token),
        expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      })
      .where(eq(mercadoPagoConnections.organizationId, organizationId));

    return tokens.access_token;
  } catch {
    // Falha na renovação: segue com o token atual, ainda válido por até 24h.
    return connection.accessToken;
  }
}
