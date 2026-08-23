import type { NextConfig } from "next";

/**
 * Headers de segurança padrão pra toda resposta. Sem CSP de propósito: um CSP
 * estrito quebra fácil sem teste em navegador de verdade (next/script, blocos
 * de vídeo embutido no funil, o Payment Brick do Mercado Pago) — entra depois,
 * calibrado em cima do app rodando, não adivinhado aqui.
 */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  // Imagem de produção enxuta: só o server.js + deps realmente usadas, sem o
  // node_modules inteiro — é o que o Dockerfile multi-stage copia no final.
  output: "standalone",
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
