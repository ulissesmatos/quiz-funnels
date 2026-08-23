"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { lintFunnel } from "@/funnel/logic/lint";
import { createEmptyFunnel, describeParseError, parseFunnelDocument } from "@/funnel/schema";
import { slugify } from "@/lib/slug";
import { requireOrganization } from "@/server/auth/session";
import { getOrganizationSubscription, isEditingBlocked } from "@/server/billing/queries";
import { db } from "@/server/db";
import { funnels, funnelVersions } from "@/server/db/schema";
import type { ActionResult } from "@/server/shared/action-result";
import { getOrganizationSettings } from "@/server/settings/queries";

const MENSAGEM_ASSINATURA_PENDENTE =
  "Assinatura pendente — regularize o pagamento em Configurações para voltar a editar. O que já está publicado continua no ar normalmente.";

export async function createFunnelAction(formData: FormData) {
  const { session, organization } = await requireOrganization();

  const name = String(formData.get("name") ?? "").trim() || "Funil sem título";
  const slug = await findAvailableSlug(organization.id, slugify(name) || "funil");

  const { defaultThemeMode } = await getOrganizationSettings();
  const document = createEmptyFunnel(name, slug, defaultThemeMode);

  const [created] = await db
    .insert(funnels)
    .values({
      organizationId: organization.id,
      slug,
      name,
      document,
      createdBy: session.user.id,
    })
    .returning({ id: funnels.id });

  revalidatePath("/funis");
  redirect(`/funis/${created.id}`);
}

/** Salva o rascunho. Chamado pelo autosave do editor e pelo copiloto. */
export async function saveFunnelDocumentAction(
  funnelId: string,
  rawDocument: unknown,
): Promise<ActionResult> {
  const { organization } = await requireOrganization();

  const subscription = await getOrganizationSubscription(organization.id);
  if (isEditingBlocked(subscription)) return { ok: false, error: MENSAGEM_ASSINATURA_PENDENTE };

  const parsed = parseFunnelDocument(rawDocument);
  if (!parsed.success) {
    return { ok: false, error: `Documento inválido — ${describeParseError(parsed.error)}` };
  }

  const result = await db
    .update(funnels)
    .set({
      document: parsed.data,
      name: parsed.data.name,
      updatedAt: new Date(),
    })
    .where(and(eq(funnels.id, funnelId), eq(funnels.organizationId, organization.id)))
    .returning({ id: funnels.id });

  if (result.length === 0) return { ok: false, error: "Funil não encontrado." };

  revalidatePath(`/funis/${funnelId}`);
  return { ok: true };
}

/**
 * Publica o rascunho atual como uma nova versão imutável e aponta o funil para
 * ela. O que já estava no ar continua intacto até esta transação terminar.
 */
export async function publishFunnelAction(funnelId: string): Promise<ActionResult> {
  const { session, organization } = await requireOrganization();

  const subscription = await getOrganizationSubscription(organization.id);
  if (isEditingBlocked(subscription)) return { ok: false, error: MENSAGEM_ASSINATURA_PENDENTE };

  const [funnel] = await db
    .select({ id: funnels.id, document: funnels.document, slug: funnels.slug })
    .from(funnels)
    .where(and(eq(funnels.id, funnelId), eq(funnels.organizationId, organization.id)))
    .limit(1);

  if (!funnel) return { ok: false, error: "Funil não encontrado." };

  const parsed = parseFunnelDocument(funnel.document);
  if (!parsed.success) {
    return { ok: false, error: `Não é possível publicar — ${describeParseError(parsed.error)}` };
  }

  /**
   * O schema garante que o documento é bem formado, não que o funil funciona.
   * Um funil pode ser válido e ainda assim ter a tela de resultado inalcançável
   * — e aí ele vai ao ar coletando respostas que nunca levam a lugar nenhum.
   * Erro de estrutura barra a publicação; aviso não.
   */
  const erros = lintFunnel(parsed.data).filter((issue) => issue.severity === "erro");

  if (erros.length > 0) {
    return {
      ok: false,
      error: `O funil tem ${erros.length === 1 ? "um problema" : `${erros.length} problemas`} que ${erros.length === 1 ? "impede" : "impedem"} a publicação:\n\n${erros.map((e) => `• ${e.message}`).join("\n\n")}`,
    };
  }

  await db.transaction(async (tx) => {
    const [{ nextVersion }] = await tx
      .select({
        nextVersion: sql<number>`coalesce(max(${funnelVersions.version}), 0) + 1`,
      })
      .from(funnelVersions)
      .where(eq(funnelVersions.funnelId, funnelId));

    const [version] = await tx
      .insert(funnelVersions)
      .values({
        funnelId,
        version: nextVersion,
        document: parsed.data,
        publishedBy: session.user.id,
      })
      .returning({ id: funnelVersions.id });

    await tx
      .update(funnels)
      .set({ publishedVersionId: version.id, status: "published", updatedAt: new Date() })
      .where(eq(funnels.id, funnelId));
  });

  revalidatePath("/funis");
  revalidatePath(`/funis/${funnelId}`);
  revalidatePath(`/f/${funnel.slug}`);
  return { ok: true };
}

export async function deleteFunnelAction(funnelId: string): Promise<ActionResult> {
  const { organization } = await requireOrganization();

  await db
    .delete(funnels)
    .where(and(eq(funnels.id, funnelId), eq(funnels.organizationId, organization.id)));

  revalidatePath("/funis");
  return { ok: true };
}

async function findAvailableSlug(organizationId: string, base: string): Promise<string> {
  for (let attempt = 0; attempt < 50; attempt++) {
    const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`;
    const [existing] = await db
      .select({ id: funnels.id })
      .from(funnels)
      .where(and(eq(funnels.organizationId, organizationId), eq(funnels.slug, candidate)))
      .limit(1);

    if (!existing) return candidate;
  }

  return `${base}-${Date.now()}`;
}
