"use server";

import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireSuperAdmin } from "@/server/auth/session";
import { db } from "@/server/db";
import { plans } from "@/server/db/schema";
import type { ActionResult } from "@/server/shared/action-result";

import { logAdminAction } from "./audit";
import { countActiveSubscriptionsForPlan } from "./plans";

const PlanInput = z.object({
  slug: z
    .string()
    .trim()
    .min(1, "Informe um identificador.")
    .regex(/^[a-z0-9-]+$/, "Só letras minúsculas, números e hífen."),
  name: z.string().trim().min(1, "Informe um nome."),
  description: z.string().trim().optional(),
  monthlyPriceCents: z.number().int().min(0, "Preço não pode ser negativo."),
  trialDays: z.number().int().min(0).max(90, "Máximo de 90 dias de trial."),
  maxFunnels: z.number().int().min(1).nullable(),
  maxLeadsPerFunnel: z.number().int().min(1).nullable(),
  canUseTeam: z.boolean(),
  canUseWebhooks: z.boolean(),
  featured: z.boolean(),
  active: z.boolean(),
});

export type PlanFormInput = z.infer<typeof PlanInput>;

export async function createPlanAction(input: PlanFormInput): Promise<ActionResult> {
  const session = await requireSuperAdmin();
  const parsed = PlanInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };

  const [conflito] = await db.select({ id: plans.id }).from(plans).where(eq(plans.slug, parsed.data.slug)).limit(1);
  if (conflito) return { ok: false, error: "Já existe um plano com este identificador." };

  const planId = await db.transaction(async (tx) => {
    const [criado] = await tx.insert(plans).values(parsed.data).returning({ id: plans.id });
    // Garante que o novo destaque some dos demais — nunca dois "recomendado" ao mesmo tempo.
    if (parsed.data.featured) {
      await tx.update(plans).set({ featured: false, updatedAt: new Date() }).where(ne(plans.id, criado.id));
    }
    return criado.id;
  });

  await logAdminAction(session.user.id, "plan_create", { type: "plan", id: planId }, { slug: parsed.data.slug });

  revalidatePath("/admin/planos");
  redirect(`/admin/planos/${planId}`);
}

export async function updatePlanAction(planId: string, input: PlanFormInput): Promise<ActionResult> {
  const session = await requireSuperAdmin();
  const parsed = PlanInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };

  const [conflito] = await db
    .select({ id: plans.id })
    .from(plans)
    .where(and(eq(plans.slug, parsed.data.slug), ne(plans.id, planId)))
    .limit(1);
  if (conflito) return { ok: false, error: "Já existe outro plano com este identificador." };

  await db.transaction(async (tx) => {
    await tx.update(plans).set({ ...parsed.data, updatedAt: new Date() }).where(eq(plans.id, planId));
    if (parsed.data.featured) {
      await tx.update(plans).set({ featured: false, updatedAt: new Date() }).where(ne(plans.id, planId));
    }
  });

  await logAdminAction(session.user.id, "plan_update", { type: "plan", id: planId });

  revalidatePath("/admin/planos");
  revalidatePath(`/admin/planos/${planId}`);
  return { ok: true };
}

export async function deletePlanAction(planId: string): Promise<ActionResult> {
  const session = await requireSuperAdmin();

  const assinantes = await countActiveSubscriptionsForPlan(planId);
  if (assinantes > 0) {
    return {
      ok: false,
      error: `${assinantes} organização${assinantes === 1 ? "" : "ões"} ainda ${assinantes === 1 ? "está" : "estão"} neste plano — desative em vez de excluir.`,
    };
  }

  await db.delete(plans).where(eq(plans.id, planId));
  await logAdminAction(session.user.id, "plan_delete", { type: "plan", id: planId });

  revalidatePath("/admin/planos");
  redirect("/admin/planos");
}
