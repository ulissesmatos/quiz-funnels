import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import type { FunnelDocument } from "@/funnel/schema";

import { organization, session, user } from "./auth";

/**
 * O documento do funil vive inteiro em uma coluna `jsonb`, tipada pelo mesmo
 * schema Zod que o editor e a IA usam. Steps e blocos não viram tabelas: eles
 * mudam a cada tecla no editor, e reescrever um JSON é muito mais barato do que
 * sincronizar dezenas de linhas — além de dar snapshot de versão de graça.
 */

export const funnels = pgTable(
  "funnels",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    /** Compõe a URL pública `/f/{slug}`. Único por organização. */
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    /** Rascunho: o que o editor manipula. Nunca é servido ao público. */
    document: jsonb("document").$type<FunnelDocument>().notNull(),
    status: text("status", { enum: ["draft", "published", "archived"] })
      .default("draft")
      .notNull(),
    /** Aponta para a versão que o público está vendo agora. */
    publishedVersionId: uuid("published_version_id"),
    /**
     * Setado quando o SISTEMA despublicou por este funil ter batido o
     * limite de leads do plano — distingue de quando a própria pessoa
     * despublicou de propósito. Zerado no próximo publish manual bem-sucedido.
     */
    autoUnpublishedAt: timestamp("auto_unpublished_at"),
    createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("funnels_org_slug_idx").on(t.organizationId, t.slug),
    index("funnels_org_idx").on(t.organizationId),
  ],
);

/**
 * Cada publicação gera uma versão imutável. A página pública lê daqui, então
 * editar o rascunho nunca altera o que já está no ar.
 */
export const funnelVersions = pgTable(
  "funnel_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    funnelId: uuid("funnel_id")
      .notNull()
      .references(() => funnels.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    document: jsonb("document").$type<FunnelDocument>().notNull(),
    publishedBy: text("published_by").references(() => user.id, { onDelete: "set null" }),
    publishedAt: timestamp("published_at").defaultNow().notNull(),
  },
  (t) => [uniqueIndex("funnel_versions_unique_idx").on(t.funnelId, t.version)],
);

/**
 * Domínios próprios apontados para um funil, resolvidos pelo middleware.
 *
 * `verificationToken` prova posse do domínio antes de servir qualquer coisa
 * nele: a pessoa cria um registro TXT com esse valor, e só depois de o DNS
 * confirmar (`verifiedAt` preenchido) o middleware passa a resolver o
 * hostname. Sem essa etapa, bastaria apontar um CNAME pra roubar tráfego de
 * um domínio que não é seu.
 */
export const funnelDomains = pgTable(
  "funnel_domains",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    funnelId: uuid("funnel_id")
      .notNull()
      .references(() => funnels.id, { onDelete: "cascade" }),
    hostname: text("hostname").notNull().unique(),
    verificationToken: text("verification_token").notNull(),
    verifiedAt: timestamp("verified_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("funnel_domains_funnel_idx").on(t.funnelId)],
);

/**
 * Assinatura de webhook: dispara em tempo real quando alguém completa um
 * funil. `funnelId` nulo = todos os funis da organização, presente = só
 * aquele. Um webhook genérico como este é o que "Webhooks by Zapier" e o
 * módulo HTTP do Make consomem direto, sem precisar de conector nativo.
 */
export const webhookSubscriptions = pgTable(
  "webhook_subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    funnelId: uuid("funnel_id").references(() => funnels.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    /** Assina o payload (HMAC-SHA256); nunca é devolvido ao cliente depois da criação. */
    secret: text("secret").notNull(),
    active: boolean("active").default(true).notNull(),
    createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("webhook_subscriptions_org_idx").on(t.organizationId)],
);

/**
 * Conexão OAuth (Connect) da organização com a própria conta Mercado Pago.
 * Uma por organização: a cobrança sempre acontece na conta de quem vende, não
 * numa conta única do SaaS — é o modelo correto pra uma plataforma que
 * processa pagamento em nome de terceiros.
 *
 * `accessToken`/`refreshToken` são cifrados em aplicação (AES-256-GCM, ver
 * `server/crypto/secret-box`) antes de chegar aqui — ao contrário da tabela
 * `account` do Better Auth, que guarda token de OAuth de login em texto puro.
 * A diferença é o que cada um autentica: `account` é login (revogável trocando
 * a sessão), esta tabela é dinheiro de terceiro passando pela plataforma.
 */
export const mercadoPagoConnections = pgTable("mercado_pago_connections", {
  organizationId: text("organization_id")
    .primaryKey()
    .references(() => organization.id, { onDelete: "cascade" }),
  mpUserId: text("mp_user_id").notNull(),
  /** Cifrado — descriptografado só em `getMercadoPagoConnection`. */
  accessToken: text("access_token").notNull(),
  /** Cifrado — descriptografado só em `getMercadoPagoConnection`. */
  refreshToken: text("refresh_token").notNull(),
  publicKey: text("public_key").notNull(),
  liveMode: boolean("live_mode").default(true).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  connectedAt: timestamp("connected_at").defaultNow().notNull(),
});

/**
 * Um pedido = uma tentativa de cobrança feita a partir do bloco de checkout.
 * `providerPaymentId` chega só depois de criar a cobrança no Mercado Pago;
 * `status` muda pelo webhook, não pela resposta síncrona da criação — cartão
 * pode aprovar na hora, PIX e boleto não.
 */
export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    funnelId: uuid("funnel_id")
      .notNull()
      .references(() => funnels.id, { onDelete: "cascade" }),
    sessionId: uuid("session_id").references(() => responseSessions.id, { onDelete: "set null" }),
    /** Presente quando este pedido é um upsell cobrado em cima de outro já aprovado. */
    parentOrderId: uuid("parent_order_id"),
    provider: text("provider", { enum: ["mercadopago"] })
      .default("mercadopago")
      .notNull(),
    providerPaymentId: text("provider_payment_id"),
    status: text("status", {
      enum: ["pending", "approved", "rejected", "refunded", "cancelled"],
    })
      .default("pending")
      .notNull(),
    amountCents: integer("amount_cents").notNull(),
    /** Quanto do `amountCents` é o order bump — 0 quando não teve. Só informativo, o total cobrado já é `amountCents`. */
    bumpAmountCents: integer("bump_amount_cents").default(0).notNull(),
    currency: text("currency").default("BRL").notNull(),
    customerEmail: text("customer_email"),
    couponCode: text("coupon_code"),
    discountCents: integer("discount_cents").default(0).notNull(),
    /**
     * Cartão salvo na Mercado Pago quando o pagamento original foi por
     * cartão — é o que permite ao upsell seguinte cobrar sem pedir dado de
     * novo. Ausentes em pedidos por PIX/boleto ou quando salvar falhou (o
     * pedido em si não depende disso pra ter sucesso).
     */
    mpCustomerId: text("mp_customer_id"),
    mpCardId: text("mp_card_id"),
    mpCardPaymentMethodId: text("mp_card_payment_method_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("orders_funnel_idx").on(t.funnelId),
    index("orders_provider_payment_idx").on(t.providerPaymentId),
    index("orders_parent_idx").on(t.parentOrderId),
  ],
);

/**
 * Cupom de desconto. `funnelId` nulo = vale pra qualquer funil da
 * organização. `value` é percentual (0-100) quando `type = "percent"`, ou
 * centavos quando `type = "fixed"` — mesma unidade de `amountCents` em
 * `orders`, pra nunca converter moeda no meio do cálculo de desconto.
 */
export const coupons = pgTable(
  "coupons",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    funnelId: uuid("funnel_id").references(() => funnels.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    type: text("type", { enum: ["percent", "fixed"] }).notNull(),
    value: integer("value").notNull(),
    maxUses: integer("max_uses"),
    usedCount: integer("used_count").default(0).notNull(),
    expiresAt: timestamp("expires_at"),
    active: boolean("active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [uniqueIndex("coupons_org_code_idx").on(t.organizationId, t.code)],
);

/**
 * Plano de assinatura da plataforma — nome, preço, trial e limites de uso,
 * tudo editável pelo painel `/admin/planos`. Sem `organizationId`: é a
 * primeira tabela global do app, compartilhada por todas as organizações.
 *
 * `active = false` tira o plano da vitrine de checkout sem quebrar quem já
 * assina nele — excluir de verdade só é permitido (checado na action, não
 * aqui) quando não sobra assinante nenhum.
 */
export const plans = pgTable("plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  monthlyPriceCents: integer("monthly_price_cents").notNull(),
  currency: text("currency").default("BRL").notNull(),
  trialDays: integer("trial_days").default(7).notNull(),
  /** `null` = sem teto. */
  maxFunnels: integer("max_funnels"),
  /** `null` = sem teto. Contagem vitalícia por funil, não por período. */
  maxLeadsPerFunnel: integer("max_leads_per_funnel"),
  canUseTeam: boolean("can_use_team").default(false).notNull(),
  canUseWebhooks: boolean("can_use_webhooks").default(false).notNull(),
  /** Só um plano deveria ter isto ligado por vez — `setFeaturedPlanAction` garante isso. */
  featured: boolean("featured").default(false).notNull(),
  active: boolean("active").default(true).notNull(),
  /** Criado sob demanda no primeiro checkout Stripe deste plano — não exige configurar nada manualmente no dashboard Stripe. */
  stripeProductId: text("stripe_product_id"),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/**
 * Assinatura da própria organização com o SaaS (nós cobrando o cliente, não o
 * cliente cobrando o dele — isso é `orders`). Uma linha por organização,
 * criada em `trialing` no instante em que a org nasce (ver
 * `server/auth/organization.ts` e o hook `afterCreateOrganization`).
 *
 * Duas formas de pagar, `provider` diz qual: a recorrente por cartão (MP
 * `PreApproval` ou Stripe `Subscription`) usa a conta da PLATAFORMA em
 * cada provedor, nunca a conta conectada de um cliente (`mercadoPagoConnections`)
 * — são contextos de pagamento completamente separados. `provider`/
 * `billingCycle` ficam nulos até o primeiro checkout ser concluído.
 */
export const organizationSubscriptions = pgTable("organization_subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: text("organization_id")
    .notNull()
    .unique()
    .references(() => organization.id, { onDelete: "cascade" }),
  planId: uuid("plan_id").references(() => plans.id),
  status: text("status", { enum: ["trialing", "active", "past_due", "canceled"] })
    .default("trialing")
    .notNull(),
  trialEndsAt: timestamp("trial_ends_at"),
  /**
   * Quando a assinatura recorrente cobra de novo, OU quando expira uma
   * assinatura anual paga à vista (Pix, sem renovação automática — sem
   * infra de cron neste app, `isSubscriptionUsable` compara este valor
   * contra `now()` na leitura em vez de depender de um job que atualize
   * `status` fisicamente).
   */
  currentPeriodEnd: timestamp("current_period_end"),
  provider: text("provider", { enum: ["mercadopago", "stripe"] }),
  billingCycle: text("billing_cycle", { enum: ["monthly", "annual"] }),
  /** Id da assinatura (`PreApproval`) na conta da plataforma na Mercado Pago. */
  mpPreapprovalId: text("mp_preapproval_id"),
  mpPayerEmail: text("mp_payer_email"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  stripeCustomerId: text("stripe_customer_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/**
 * Log de erro de servidor, pra alimentar o painel `/admin` sem depender de um
 * serviço externo (Sentry) — o deploy é self-hosted via docker-compose, então
 * uma tabela própria fecha o ciclo sem exigir conta/DSN de terceiro.
 * `organizationId` sem FK: um erro pode acontecer antes de resolver
 * organização nenhuma, e não vale bloquear o log por isso.
 */
export const errorLogs = pgTable(
  "error_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** De onde veio — nome da rota ou da server action, ex.: "api/checkout/pay". */
    source: text("source").notNull(),
    message: text("message").notNull(),
    stack: text("stack"),
    context: jsonb("context").$type<Record<string, unknown>>().default({}).notNull(),
    organizationId: text("organization_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("error_logs_created_idx").on(t.createdAt)],
);

/**
 * Registra quando um super admin opera dentro da organização de outra pessoa
 * (suporte/depuração). `sessionId` amarra o registro à sessão de navegador
 * específica que fez o impersonate — ver `server/admin/impersonation.ts` pra
 * como isso substitui a checagem normal de member em `getActiveOrganization`.
 */
export const impersonationLogs = pgTable(
  "impersonation_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    adminUserId: text("admin_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    sessionId: text("session_id")
      .notNull()
      .references(() => session.id, { onDelete: "cascade" }),
    startedAt: timestamp("started_at").defaultNow().notNull(),
    endedAt: timestamp("ended_at"),
  },
  (t) => [index("impersonation_logs_session_idx").on(t.sessionId)],
);

/**
 * Trilha de auditoria legível do painel `/admin` — toda ação sensível de um
 * super admin vira uma linha aqui, além de qualquer efeito mecânico próprio
 * (ex.: impersonate também grava em `impersonationLogs`, que é o que
 * `getActiveOrganization` de fato usa pra decidir sessão; esta tabela é só
 * pra exibição em Auditoria, nunca lida por lógica de acesso). Sem
 * update/delete pela UI de propósito — um log editável não serve de
 * auditoria.
 */
export const adminAuditLogs = pgTable(
  "admin_audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorUserId: text("actor_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    action: text("action", {
      enum: [
        "impersonate_start",
        "impersonate_stop",
        "subscription_override",
        "promote_super_admin",
        "demote_super_admin",
        "plan_create",
        "plan_update",
        "plan_delete",
      ],
    }).notNull(),
    targetType: text("target_type", { enum: ["organization", "user", "plan"] }).notNull(),
    targetId: text("target_id").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("admin_audit_logs_created_idx").on(t.createdAt)],
);

/**
 * Uma linha por organização. Hoje só guarda o modo de tema padrão pra funil
 * novo — separado de `organization` (tabela do Better Auth, não renomear/
 * reaproveitar colunas dela) pra não misturar dado de auth com preferência
 * do produto.
 */
export const organizationSettings = pgTable("organization_settings", {
  organizationId: text("organization_id")
    .primaryKey()
    .references(() => organization.id, { onDelete: "cascade" }),
  defaultThemeMode: text("default_theme_mode", { enum: ["light", "dark", "auto"] })
    .default("dark")
    .notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/** Arquivos enviados pelo usuário, guardados no S3/MinIO. */
export const assets = pgTable(
  "assets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    /** Caminho do objeto dentro do bucket. */
    key: text("key").notNull(),
    url: text("url").notNull(),
    filename: text("filename").notNull(),
    contentType: text("content_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    width: integer("width"),
    height: integer("height"),
    uploadedBy: text("uploaded_by").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("assets_org_idx").on(t.organizationId)],
);

/**
 * Uma sessão de resposta = uma pessoa percorrendo o funil. As respostas ficam
 * em `answers` (jsonb, chaveado pelo `name` do bloco) porque o formato varia a
 * cada funil; consultas por resposta específica usam operadores jsonb.
 */
export const responseSessions = pgTable(
  "response_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    funnelId: uuid("funnel_id")
      .notNull()
      .references(() => funnels.id, { onDelete: "cascade" }),
    funnelVersionId: uuid("funnel_version_id").references(() => funnelVersions.id, {
      onDelete: "set null",
    }),
    answers: jsonb("answers").$type<Record<string, unknown>>().default({}).notNull(),
    /** Pontuação total e por categoria, no fechamento da sessão. */
    scores: jsonb("scores").$type<Record<string, number>>().default({}).notNull(),
    /** Resultado exibido, quando o funil tem tela de diagnóstico. */
    outcomeId: text("outcome_id"),
    /** Último step visto — é o que dá o relatório de abandono. */
    lastStepId: text("last_step_id"),
    completedAt: timestamp("completed_at"),
    /** UTMs e demais parâmetros da URL de entrada. */
    utm: jsonb("utm").$type<Record<string, string>>().default({}).notNull(),
    referrer: text("referrer"),
    userAgent: text("user_agent"),
    country: text("country"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("response_sessions_funnel_idx").on(t.funnelId),
    index("response_sessions_created_idx").on(t.funnelId, t.createdAt),
  ],
);

/** Eventos brutos de navegação, base do funil de abandono por step. */
export const funnelEvents = pgTable(
  "funnel_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    funnelId: uuid("funnel_id")
      .notNull()
      .references(() => funnels.id, { onDelete: "cascade" }),
    sessionId: uuid("session_id").references(() => responseSessions.id, { onDelete: "cascade" }),
    type: text("type", {
      enum: ["view", "step_view", "answer", "complete", "click"],
    }).notNull(),
    stepId: text("step_id"),
    payload: jsonb("payload").$type<Record<string, unknown>>().default({}).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("funnel_events_funnel_created_idx").on(t.funnelId, t.createdAt)],
);

/** Conversas do copiloto, uma por funil e usuário. */
export const aiThreads = pgTable(
  "ai_threads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    funnelId: uuid("funnel_id")
      .notNull()
      .references(() => funnels.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("ai_threads_funnel_idx").on(t.funnelId)],
);

export const aiMessages = pgTable(
  "ai_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    threadId: uuid("thread_id")
      .notNull()
      .references(() => aiThreads.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["user", "assistant", "system"] }).notNull(),
    /** Partes da mensagem no formato do AI SDK (texto + chamadas de tool). */
    parts: jsonb("parts").$type<unknown[]>().default([]).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("ai_messages_thread_idx").on(t.threadId, t.createdAt)],
);

// ── Relações ───────────────────────────────────────────────────

export const funnelsRelations = relations(funnels, ({ many, one }) => ({
  versions: many(funnelVersions),
  domains: many(funnelDomains),
  sessions: many(responseSessions),
  publishedVersion: one(funnelVersions, {
    fields: [funnels.publishedVersionId],
    references: [funnelVersions.id],
  }),
}));

export const funnelVersionsRelations = relations(funnelVersions, ({ one }) => ({
  funnel: one(funnels, { fields: [funnelVersions.funnelId], references: [funnels.id] }),
}));

export const responseSessionsRelations = relations(responseSessions, ({ one, many }) => ({
  funnel: one(funnels, { fields: [responseSessions.funnelId], references: [funnels.id] }),
  events: many(funnelEvents),
}));

export type Funnel = typeof funnels.$inferSelect;
export type NewFunnel = typeof funnels.$inferInsert;
export type FunnelVersion = typeof funnelVersions.$inferSelect;
export type ResponseSession = typeof responseSessions.$inferSelect;
export type WebhookSubscription = typeof webhookSubscriptions.$inferSelect;
export type FunnelDomain = typeof funnelDomains.$inferSelect;
export type MercadoPagoConnection = typeof mercadoPagoConnections.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type Coupon = typeof coupons.$inferSelect;
export type OrganizationSubscription = typeof organizationSubscriptions.$inferSelect;
export type Plan = typeof plans.$inferSelect;
export type NewPlan = typeof plans.$inferInsert;
export type ErrorLog = typeof errorLogs.$inferSelect;
export type ImpersonationLog = typeof impersonationLogs.$inferSelect;
export type AdminAuditLog = typeof adminAuditLogs.$inferSelect;
