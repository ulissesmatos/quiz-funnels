import "server-only";

import { eq } from "drizzle-orm";
import { MercadoPagoConfig, Payment, PreApproval } from "mercadopago";

import { env } from "@/lib/env";
import { db, type DbOrTx } from "@/server/db";
import { organizationSubscriptions, type Plan } from "@/server/db/schema";

import { PIX_ANNUAL_DISCOUNT } from "./constants";
import { getFeaturedPlan } from "./plans";

export type BillingCycle = "monthly" | "annual";

/**
 * Cria a linha de assinatura em `trialing`, associada ao plano em destaque
 * (ou o mais barato ativo, se nenhum estiver marcado) — chamado tanto pela
 * org pessoal do cadastro (`createPersonalOrganization`, fora da API do
 * plugin) quanto pelo hook `afterCreateOrganization` (org criada depois,
 * pela API do Better Auth). `onConflictDoNothing` deixa a função idempotente:
 * nunca vale a pena falhar o cadastro por causa disto.
 *
 * Aceita um `dbClient` opcional (uma `tx` de transação) pra poder ser chamada
 * como parte de um `db.transaction(...)` maior — ver `createPersonalOrganization`,
 * que precisa que org + membership + assinatura sejam tudo-ou-nada.
 */
export async function startTrialSubscription(organizationId: string, dbClient: DbOrTx = db): Promise<void> {
  const plan = await getFeaturedPlan();
  const trialDays = plan?.trialDays ?? 7;
  const trialEndsAt = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000);

  await dbClient
    .insert(organizationSubscriptions)
    .values({ organizationId, planId: plan?.id ?? null, status: "trialing", trialEndsAt })
    .onConflictDoNothing({ target: organizationSubscriptions.organizationId });
}

function platformClient(): MercadoPagoConfig | null {
  const accessToken = env().MERCADOPAGO_PLATFORM_ACCESS_TOKEN;
  if (!accessToken) return null;
  return new MercadoPagoConfig({ accessToken, options: { timeout: 8000 } });
}

export type StartCheckoutResult = { ok: true; initPoint: string } | { ok: false; error: string };

function valorAnual(plan: Plan): number {
  return (plan.monthlyPriceCents * 12) / 100;
}

/**
 * Cria a assinatura (`PreApproval`) na conta MP da própria plataforma e
 * devolve a URL de autorização hospedada pela Mercado Pago — o comprador
 * cadastra o cartão lá, não num formulário nosso. `external_reference` é o id
 * da organização: é como o webhook (`applyPreapprovalStatusUpdate`) sabe qual
 * linha atualizar quando a assinatura for autorizada.
 *
 * `cycle` decide a periodicidade da cobrança (mensal ou anual) — o valor
 * cobrado a cada ciclo já é o total daquele ciclo, não o preço mensal do
 * plano repetido.
 *
 * Antes de criar uma nova: se já existe uma assinatura pendente desta
 * organização (alguém clicou, abandonou a página da MP, voltou e clicou de
 * novo), reaproveita o mesmo `init_point` em vez de abrir outra — sem essa
 * checagem, autorizar duas pendentes cobraria a organização em dobro.
 */
export async function startMercadoPagoCardCheckout(
  organizationId: string,
  payerEmail: string,
  plan: Plan,
  cycle: BillingCycle,
): Promise<StartCheckoutResult> {
  const client = platformClient();
  if (!client) return { ok: false, error: "Mercado Pago ainda não está configurado neste ambiente." };

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

  const transactionAmount = cycle === "annual" ? valorAnual(plan) : plan.monthlyPriceCents / 100;

  const response = await preApproval.create({
    body: {
      reason: `${plan.name} (${cycle === "annual" ? "anual" : "mensal"})`,
      external_reference: organizationId,
      payer_email: payerEmail,
      back_url: `${env().BETTER_AUTH_URL}/configuracoes/planos?assinatura=confirmada`,
      auto_recurring: {
        frequency: cycle === "annual" ? 12 : 1,
        frequency_type: "months",
        transaction_amount: transactionAmount,
        currency_id: plan.currency,
      },
    },
    requestOptions: { idempotencyKey: `${organizationId}:${plan.id}:${cycle}:${Date.now()}` },
  });

  if (!response.init_point || !response.id) {
    return { ok: false, error: "Não foi possível iniciar a assinatura." };
  }

  await db
    .update(organizationSubscriptions)
    .set({
      planId: plan.id,
      provider: "mercadopago",
      billingCycle: cycle,
      mpPreapprovalId: response.id,
      mpPayerEmail: payerEmail,
      updatedAt: new Date(),
    })
    .where(eq(organizationSubscriptions.organizationId, organizationId));

  return { ok: true, initPoint: response.init_point };
}

export type PixCheckoutResult =
  | { ok: true; paymentId: string; qrCode: string; qrCodeBase64: string }
  | { ok: false; error: string };

/**
 * Pagamento único via Pix do valor ANUAL com 5% de desconto extra — não é uma
 * assinatura recorrente: sem renovação automática. `currentPeriodEnd` fica
 * fixo em +365 dias a partir da confirmação; o vencimento é comparado contra
 * `now()` na leitura (`isEditingBlocked`), já que este app não tem
 * infraestrutura de cron pra expirar a linha sozinho quando a data chega.
 */
export async function startMercadoPagoPixCheckout(
  organizationId: string,
  payerEmail: string,
  plan: Plan,
): Promise<PixCheckoutResult> {
  const client = platformClient();
  if (!client) return { ok: false, error: "Mercado Pago ainda não está configurado neste ambiente." };

  const valorComDesconto = Math.round(valorAnual(plan) * (1 - PIX_ANNUAL_DISCOUNT) * 100) / 100;

  const response = await new Payment(client).create({
    body: {
      transaction_amount: valorComDesconto,
      description: `${plan.name} — plano anual via Pix`,
      payment_method_id: "pix",
      payer: { email: payerEmail },
      external_reference: organizationId,
      notification_url: `${env().BETTER_AUTH_URL}/api/webhooks/mercadopago-platform`,
      metadata: { plan_id: plan.id, billing_cycle: "annual" },
    },
    requestOptions: { idempotencyKey: `${organizationId}:${plan.id}:pix:${Date.now()}` },
  });

  const dadosPix = response.point_of_interaction?.transaction_data;
  if (!response.id || !dadosPix?.qr_code || !dadosPix.qr_code_base64) {
    return { ok: false, error: "Não foi possível gerar o Pix." };
  }

  await db
    .update(organizationSubscriptions)
    .set({
      planId: plan.id,
      provider: "mercadopago",
      billingCycle: "annual",
      mpPayerEmail: payerEmail,
      updatedAt: new Date(),
    })
    .where(eq(organizationSubscriptions.organizationId, organizationId));

  return { ok: true, paymentId: String(response.id), qrCode: dadosPix.qr_code, qrCodeBase64: dadosPix.qr_code_base64 };
}

/**
 * Confere um pagamento Pix específico na Mercado Pago e aplica o resultado —
 * usado tanto pelo webhook quanto pelo botão "Já paguei" (sem cron, é o único
 * outro jeito de perceber a confirmação se a notificação atrasar ou falhar).
 */
export async function confirmMercadoPagoPixPayment(paymentId: string): Promise<{ approved: boolean }> {
  const client = platformClient();
  if (!client) return { approved: false };

  const response = await new Payment(client).get({ id: paymentId });
  if (response.status !== "approved" || !response.external_reference) return { approved: false };

  await db
    .update(organizationSubscriptions)
    .set({
      status: "active",
      currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(),
    })
    .where(eq(organizationSubscriptions.organizationId, response.external_reference));

  return { approved: true };
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
