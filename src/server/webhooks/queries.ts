import "server-only";

import { desc, eq } from "drizzle-orm";

import { db } from "@/server/db";
import { funnels, webhookSubscriptions } from "@/server/db/schema";

export type WebhookSubscriptionListItem = {
  id: string;
  url: string;
  funnelId: string | null;
  funnelName: string | null;
  active: boolean;
  createdAt: Date;
  /** Só os últimos 4 caracteres — o segredo inteiro só existe na hora da criação. */
  secretPreview: string;
};

export async function listWebhookSubscriptions(organizationId: string): Promise<WebhookSubscriptionListItem[]> {
  const rows = await db
    .select({
      id: webhookSubscriptions.id,
      url: webhookSubscriptions.url,
      funnelId: webhookSubscriptions.funnelId,
      funnelName: funnels.name,
      active: webhookSubscriptions.active,
      createdAt: webhookSubscriptions.createdAt,
      secret: webhookSubscriptions.secret,
    })
    .from(webhookSubscriptions)
    .leftJoin(funnels, eq(webhookSubscriptions.funnelId, funnels.id))
    .where(eq(webhookSubscriptions.organizationId, organizationId))
    .orderBy(desc(webhookSubscriptions.createdAt));

  return rows.map((row) => ({
    id: row.id,
    url: row.url,
    funnelId: row.funnelId,
    funnelName: row.funnelName,
    active: row.active,
    createdAt: row.createdAt,
    secretPreview: `••••${row.secret.slice(-4)}`,
  }));
}
