import "server-only";

import { z } from "zod";

/**
 * Variáveis de ambiente do servidor, validadas na primeira leitura.
 * Falhar aqui é melhor do que descobrir um `undefined` no meio de uma request.
 */
const schema = z.object({
  DATABASE_URL: z.string().url(),

  BETTER_AUTH_SECRET: z.string().min(16),
  BETTER_AUTH_URL: z.string().url(),

  /**
   * Chave simétrica (AES-256-GCM) que cifra segredo de terceiro antes de
   * gravar no banco — hoje, o access/refresh token da conexão Mercado Pago de
   * cada organização. 32 bytes em base64: `openssl rand -base64 32`.
   */
  ENCRYPTION_KEY: z.string().min(1),

  S3_ENDPOINT: z.string().url(),
  S3_REGION: z.string().min(1),
  S3_BUCKET: z.string().min(1),
  S3_ACCESS_KEY_ID: z.string().min(1),
  S3_SECRET_ACCESS_KEY: z.string().min(1),
  S3_FORCE_PATH_STYLE: z
    .string()
    .optional()
    .transform((v) => v === "true"),
  S3_PUBLIC_URL: z.string().url(),

  OPENROUTER_API_KEY: z.string().optional(),
  OPENROUTER_MODEL: z.string().default("anthropic/claude-sonnet-4.5"),

  EMAIL_FROM: z.string().default("nao-responda@localhost"),
  RESEND_API_KEY: z.string().optional(),

  /**
   * Credenciais da Application do Mercado Pago — pertencem à plataforma
   * (Ulisses), não a um cliente. Cada organização conecta a própria conta por
   * OAuth; estas chaves só autenticam a troca de código por token nesse fluxo.
   */
  MERCADOPAGO_APP_ID: z.string().optional(),
  MERCADOPAGO_CLIENT_SECRET: z.string().optional(),
  MERCADOPAGO_WEBHOOK_SECRET: z.string().optional(),

  /**
   * Conta Mercado Pago da PRÓPRIA plataforma (Ulisses), separada da conexão
   * OAuth acima — usada só pra cobrar a assinatura das organizações que usam
   * o SaaS, nunca pra cobrar o cliente final de ninguém.
   */
  MERCADOPAGO_PLATFORM_ACCESS_TOKEN: z.string().optional(),
  MERCADOPAGO_PLATFORM_WEBHOOK_SECRET: z.string().optional(),
});

let cached: z.infer<typeof schema> | null = null;

export function env(): z.infer<typeof schema> {
  if (cached) return cached;

  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(
      `Variáveis de ambiente inválidas ou ausentes:\n${issues}\n\nCopie .env.example para .env e preencha os valores.`,
    );
  }

  cached = parsed.data;
  return cached;
}
