"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireOrganization } from "@/server/auth/session";
import { db } from "@/server/db";
import { coupons } from "@/server/db/schema";
import type { ActionResult } from "@/server/shared/action-result";

import { calcularDesconto, validateCoupon, type ValidCoupon } from "./validate";

const CodeSchema = z
  .string()
  .trim()
  .min(2)
  .max(32)
  .regex(/^[A-Za-z0-9_-]+$/, "Use só letras, números, hífen ou underline");

export async function createCouponAction(input: {
  code: string;
  type: "percent" | "fixed";
  value: number;
  funnelId: string | null;
  maxUses: number | null;
  expiresAt: string | null;
}): Promise<ActionResult> {
  const { organization } = await requireOrganization();

  const parsedCode = CodeSchema.safeParse(input.code);
  if (!parsedCode.success) return { ok: false, error: parsedCode.error.issues[0].message };

  if (input.type === "percent" && (input.value < 1 || input.value > 100)) {
    return { ok: false, error: "Desconto percentual precisa ficar entre 1 e 100." };
  }
  if (input.type === "fixed" && input.value < 1) {
    return { ok: false, error: "Desconto em reais precisa ser maior que zero." };
  }

  try {
    await db.insert(coupons).values({
      organizationId: organization.id,
      code: parsedCode.data.toUpperCase(),
      type: input.type,
      value: input.value,
      funnelId: input.funnelId,
      maxUses: input.maxUses,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
    });
  } catch {
    return { ok: false, error: "Já existe um cupom com este código." };
  }

  revalidatePath("/configuracoes");
  return { ok: true };
}

export async function toggleCouponAction(id: string, active: boolean): Promise<ActionResult> {
  const { organization } = await requireOrganization();

  const result = await db
    .update(coupons)
    .set({ active })
    .where(and(eq(coupons.id, id), eq(coupons.organizationId, organization.id)))
    .returning({ id: coupons.id });

  if (result.length === 0) return { ok: false, error: "Cupom não encontrado." };

  revalidatePath("/configuracoes");
  return { ok: true };
}

export async function deleteCouponAction(id: string): Promise<ActionResult> {
  const { organization } = await requireOrganization();

  await db.delete(coupons).where(and(eq(coupons.id, id), eq(coupons.organizationId, organization.id)));

  revalidatePath("/configuracoes");
  return { ok: true };
}

export type ApplyCouponResult =
  | { ok: true; coupon: ValidCoupon; discountCents: number }
  | { ok: false; error: string };

/**
 * Chamado do funil público (bloco de checkout) pra pré-visualizar o desconto
 * antes de pagar — não confirma nada, não incrementa `usedCount`. Isso só
 * acontece de verdade na confirmação do pagamento (webhook), pra não queimar
 * um uso de cupom em alguém que nunca terminou de pagar.
 */
export async function applyCouponAction(
  funnelId: string,
  code: string,
  amountCents: number,
): Promise<ApplyCouponResult> {
  const result = await validateCoupon(funnelId, code);
  if (!result.ok) return result;

  return { ok: true, coupon: result.coupon, discountCents: calcularDesconto(amountCents, result.coupon) };
}
