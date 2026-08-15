import { relations } from "drizzle-orm";
import {
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

import { organization, user } from "./auth";

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

/** Domínios próprios apontados para um funil, resolvidos pelo middleware. */
export const funnelDomains = pgTable(
  "funnel_domains",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    funnelId: uuid("funnel_id")
      .notNull()
      .references(() => funnels.id, { onDelete: "cascade" }),
    hostname: text("hostname").notNull().unique(),
    verifiedAt: timestamp("verified_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("funnel_domains_funnel_idx").on(t.funnelId)],
);

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
