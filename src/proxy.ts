import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { env } from "@/lib/env";
import { getVerifiedFunnelSlugByHostname } from "@/server/domains/queries";

/**
 * Resolve domínio próprio pro funil certo.
 *
 * Roda no runtime Node.js (padrão do Proxy a partir do Next 16 — diferente do
 * antigo `middleware.ts`, que rodava no Edge por padrão e não conseguiria usar
 * o driver `postgres` deste projeto). Só consulta o banco quando o `Host` da
 * requisição é diferente do host conhecido do app: tráfego normal (`/funis`,
 * `/entrar`, etc.) nunca paga essa consulta.
 */
export async function proxy(request: NextRequest) {
  const host = request.headers.get("host");
  if (!host) return NextResponse.next();

  const appHost = new URL(env().BETTER_AUTH_URL).host;
  if (host === appHost) return NextResponse.next();

  const slug = await getVerifiedFunnelSlugByHostname(host.toLowerCase());
  if (!slug) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = `/f/${slug}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
