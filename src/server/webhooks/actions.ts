"use server";

import { randomBytes } from "node:crypto";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getPlanLimits } from "@/server/billing/plans";
import { requireOrganization } from "@/server/auth/session";
import { db } from "@/server/db";
import { funnels, webhookSubscriptions } from "@/server/db/schema";
import type { ActionResult } from "@/server/shared/action-result";

const UrlSchema = z.string().url("Informe uma URL válida, começando com https://");

export type CreateWebhookResult = { ok: true; secret: string } | { ok: false; error: string };

/**
 * Cria a assinatura e devolve o segredo em texto puro — a única vez que ele
 * volta pro cliente. Depois disso só `secretPreview` (últimos 4 caracteres),
 * ver `queries.ts`.
 */
export async function createWebhookAction(url: string, funnelId: string | null): Promise<CreateWebhookResult> {
  const { session, organization } = await requireOrganization();

  const limits = await getPlanLimits(organization.id);
  if (!limits?.canUseWebhooks) {
    return { ok: false, error: "Seu plano atual não inclui webhooks — faça upgrade em Configurações." };
  }

  const parsedUrl = UrlSchema.safeParse(url);
  if (!parsedUrl.success) return { ok: false, error: parsedUrl.error.issues[0].message };

  if (funnelId) {
    const [funnel] = await db
      .select({ id: funnels.id })
      .from(funnels)
      .where(and(eq(funnels.id, funnelId), eq(funnels.organizationId, organization.id)))
      .limit(1);
    if (!funnel) return { ok: false, error: "Funil não encontrado." };
  }

  const secret = randomBytes(24).toString("hex");

  await db.insert(webhookSubscriptions).values({
    organizationId: organization.id,
    funnelId,
    url: parsedUrl.data,
    secret,
    createdBy: session.user.id,
  });

  revalidatePath("/configuracoes");
  return { ok: true, secret };
}

export async function toggleWebhookAction(id: string, active: boolean): Promise<ActionResult> {
  const { organization } = await requireOrganization();

  const result = await db
    .update(webhookSubscriptions)
    .set({ active })
    .where(and(eq(webhookSubscriptions.id, id), eq(webhookSubscriptions.organizationId, organization.id)))
    .returning({ id: webhookSubscriptions.id });

  if (result.length === 0) return { ok: false, error: "Webhook não encontrado." };

  revalidatePath("/configuracoes");
  return { ok: true };
}

export async function deleteWebhookAction(id: string): Promise<ActionResult> {
  const { organization } = await requireOrganization();

  await db
    .delete(webhookSubscriptions)
    .where(and(eq(webhookSubscriptions.id, id), eq(webhookSubscriptions.organizationId, organization.id)));

  revalidatePath("/configuracoes");
  return { ok: true };
}
