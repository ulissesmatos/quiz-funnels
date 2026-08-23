import "server-only";

import { eq } from "drizzle-orm";
import { MercadoPagoConfig, PreApproval } from "mercadopago";

import { env } from "@/lib/env";
import { db } from "@/server/db";
import { organizationSubscriptions } from "@/server/db/schema";

import { PLAN } from "./plan";

/**
 * Cria a linha de assinatura em `trialing` no instante em que uma organização
 * nasce — chamado tanto pela org pessoal do cadastro (`createPersonalOrganization`,
 * fora da API do plugin) quanto pelo hook `afterCreateOrganization` (org
 * criada depois, pela API do Better Auth). `onConflictDoNothing` deixa a
 * função idempotente: nunca vale a pena falhar o cadastro por causa disto.
 */
export async function startTrialSubscription(organizationId: string): Promise<void> {
  const trialEndsAt = new Date(Date.now() + PLAN.trialDays * 24 * 60 * 60 * 1000);

  await db
    .insert(organizationSubscriptions)
    .values({ organizationId, status: "trialing", trialEndsAt })
    .onConflictDoNothing({ target: organizationSubscriptions.organizationId });
}

function platformClient(): MercadoPagoConfig | null {
  const accessToken = env().MERCADOPAGO_PLATFORM_ACCESS_TOKEN;
  if (!accessToken) return null;
  return new MercadoPagoConfig({ accessToken, options: { timeout: 8000 } });
}

export type StartCheckoutResult =
  | { ok: true; initPoint: string }
  | { ok: false; error: string };

/**
 * Cria a assinatura (`PreApproval`) na conta MP da própria plataforma e
 * devolve a URL de autorização hospedada pela Mercado Pago — o comprador
 * cadastra o cartão lá, não num formulário nosso. `external_reference` é o id
 * da organização: é como o webhook (`applyPreapprovalUpdate`) sabe qual linha
 * atualizar quando a assinatura for autorizada.
 *
 * Antes de criar uma nova: se já existe uma assinatura pendente desta
 * organização (alguém clicou, abandonou a página da MP, voltou e clicou de
 * novo), reaproveita o mesmo `init_point` em vez de abrir outra — sem essa
 * checagem, autorizar duas pendentes cobraria a organização em dobro.
 */
export async function startPlatformSubscriptionCheckout(
  organizationId: string,
  payerEmail: string,
): Promise<StartCheckoutResult> {
  const client = platformClient();
  if (!client) {
    return { ok: false, error: "Faturamento ainda não está configurado neste ambiente." };
  }

  const preApproval = new PreApproval(client);

  const [existing] = await db
    .select({ mpPreapprovalId: organizationSubscriptions.mpPreapprovalId })
    .from(organizationSubscriptions)
    .where(eq(organizationSubscriptions.organizationId, organizationId))
    .limit(1);

  if (existing?.mpPreapprovalId) {
    const pending = await preApproval.get({ id: existing.mpPreapprovalId });
    if (pending.status === "pending" && pending.init_point) {
      return { ok: true, initPoint: pending.init_point };
    }
  }

  const response = await preApproval.create({
    body: {
      reason: PLAN.name,
      external_reference: organizationId,
      payer_email: payerEmail,
      back_url: `${env().BETTER_AUTH_URL}/configuracoes?assinatura=confirmada`,
      auto_recurring: {
        frequency: PLAN.frequency,
        frequency_type: PLAN.frequencyType,
        transaction_amount: PLAN.priceCents / 100,
        currency_id: PLAN.currency,
      },
    },
    requestOptions: { idempotencyKey: `${organizationId}:${Date.now()}` },
  });

  if (!response.init_point || !response.id) {
    return { ok: false, error: "Não foi possível iniciar a assinatura." };
  }

  await db
    .update(organizationSubscriptions)
    .set({ mpPreapprovalId: response.id, mpPayerEmail: payerEmail, updatedAt: new Date() })
    .where(eq(organizationSubscriptions.organizationId, organizationId));

  return { ok: true, initPoint: response.init_point };
}

/**
 * `status` da MP pra assinatura tem só 3 valores relevantes pra nós:
 * `authorized` (cobrando normalmente), `paused` e `cancelled`. Sem estado
 * "atrasado" nativo aqui — quem sinaliza atraso é o evento de cobrança
 * (`subscription_authorized_payment`) recusada, tratado à parte no webhook.
 */
export function mapPreapprovalStatus(mpStatus: string | undefined): "active" | "past_due" | "canceled" | null {
  switch (mpStatus) {
    case "authorized":
      return "active";
    case "paused":
      return "past_due";
    case "cancelled":
      return "canceled";
    default:
      return null;
  }
}

export async function applyPreapprovalStatusUpdate(
  preapprovalId: string,
  mpStatus: string | undefined,
  nextPaymentDate?: string,
) {
  const status = mapPreapprovalStatus(mpStatus);
  if (!status) return;

  await db
    .update(organizationSubscriptions)
    .set({
      status,
      currentPeriodEnd: nextPaymentDate ? new Date(nextPaymentDate) : undefined,
      updatedAt: new Date(),
    })
    .where(eq(organizationSubscriptions.mpPreapprovalId, preapprovalId));
}
