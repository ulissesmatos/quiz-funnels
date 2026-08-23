"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { describeParseError, FunnelPixels, parseFunnelDocument } from "@/funnel/schema";
import { requireOrganization } from "@/server/auth/session";
import { db } from "@/server/db";
import { funnels } from "@/server/db/schema";
import { getFunnelForOrganization } from "@/server/funnels/queries";
import type { ActionResult } from "@/server/shared/action-result";

/** O formulário sempre manda string; campo vazio deve virar "não configurado", não uma string vazia inválida. */
function cleanPixelInputs(raw: Record<string, string>): Record<string, string | undefined> {
  return Object.fromEntries(Object.entries(raw).map(([key, value]) => [key, value.trim() || undefined]));
}

/**
 * Salva só `settings.pixels` do rascunho — diferente de `saveFunnelDocumentAction`,
 * que espera o documento inteiro vindo do autosave do editor. Como qualquer
 * outra edição, só vale ao vivo depois de publicar.
 */
export async function updateFunnelPixelsAction(
  funnelId: string,
  rawPixels: Record<string, string>,
): Promise<ActionResult> {
  const { organization } = await requireOrganization();

  const funnel = await getFunnelForOrganization(funnelId, organization.id);
  if (!funnel) return { ok: false, error: "Funil não encontrado." };

  const parsedPixels = FunnelPixels.safeParse(cleanPixelInputs(rawPixels));
  if (!parsedPixels.success) {
    return { ok: false, error: `Rastreamento inválido — ${describeParseError(parsedPixels.error)}` };
  }

  const patchedDocument = {
    ...funnel.document,
    settings: { ...funnel.document.settings, pixels: parsedPixels.data },
  };

  const parsedDocument = parseFunnelDocument(patchedDocument);
  if (!parsedDocument.success) {
    return { ok: false, error: `Documento inválido — ${describeParseError(parsedDocument.error)}` };
  }

  const result = await db
    .update(funnels)
    .set({ document: parsedDocument.data, updatedAt: new Date() })
    .where(and(eq(funnels.id, funnelId), eq(funnels.organizationId, organization.id)))
    .returning({ id: funnels.id });

  if (result.length === 0) return { ok: false, error: "Funil não encontrado." };

  revalidatePath(`/funis/${funnelId}/analytics`);
  revalidatePath(`/funis/${funnelId}`);
  return { ok: true };
}
