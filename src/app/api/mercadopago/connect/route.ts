import { NextResponse } from "next/server";

import { env } from "@/lib/env";
import { requireOrganization } from "@/server/auth/session";
import { createConnectState } from "@/server/mercadopago/state";

export const runtime = "nodejs";

/** Início do fluxo OAuth: manda o dono do funil pra tela de autorização da Mercado Pago. */
export async function GET() {
  const { organization } = await requireOrganization();
  const { MERCADOPAGO_APP_ID } = env();

  if (!MERCADOPAGO_APP_ID) {
    return NextResponse.json(
      { error: "Defina MERCADOPAGO_APP_ID e MERCADOPAGO_CLIENT_SECRET no .env para conectar o Mercado Pago." },
      { status: 503 },
    );
  }

  const url = new URL("https://auth.mercadopago.com/authorization");
  url.searchParams.set("client_id", MERCADOPAGO_APP_ID);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("platform_id", "mp");
  url.searchParams.set("redirect_uri", `${env().BETTER_AUTH_URL}/api/mercadopago/callback`);
  url.searchParams.set("state", createConnectState(organization.id));

  return NextResponse.redirect(url);
}
