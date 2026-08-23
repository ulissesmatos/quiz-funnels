import "server-only";

import { and, eq } from "drizzle-orm";

import { db } from "@/server/db";
import { coupons, funnels } from "@/server/db/schema";

export type ValidCoupon = { id: string; code: string; type: "percent" | "fixed"; value: number };
export type CouponValidation = { ok: true; coupon: ValidCoupon } | { ok: false; error: string };

/**
 * Valida um cupom a partir do funil público, não da organização — quem chama
 * isto é o visitante do funil, sem sessão nenhuma. `funnelId` resolve a
 * organização internamente (join), então não há como validar cupom de uma
 * organização passando o id de outra.
 */
export async function validateCoupon(funnelId: string, codeRaw: string): Promise<CouponValidation> {
  const code = codeRaw.trim().toUpperCase();
  if (!code) return { ok: false, error: "Digite um cupom." };

  const [funnel] = await db.select({ organizationId: funnels.organizationId }).from(funnels).where(eq(funnels.id, funnelId)).limit(1);
  if (!funnel) return { ok: false, error: "Cupom inválido." };

  const [coupon] = await db
    .select()
    .from(coupons)
    .where(and(eq(coupons.organizationId, funnel.organizationId), eq(coupons.code, code), eq(coupons.active, true)))
    .limit(1);

  if (!coupon) return { ok: false, error: "Cupom inválido." };
  if (coupon.funnelId && coupon.funnelId !== funnelId) return { ok: false, error: "Este cupom não vale para este funil." };
  if (coupon.expiresAt && coupon.expiresAt.getTime() < Date.now()) return { ok: false, error: "Cupom expirado." };
  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) return { ok: false, error: "Cupom esgotado." };

  return { ok: true, coupon: { id: coupon.id, code: coupon.code, type: coupon.type, value: coupon.value } };
}

/** Desconto em centavos, nunca negativo nem maior que o próprio preço. */
export function calcularDesconto(amountCents: number, coupon: Pick<ValidCoupon, "type" | "value">): number {
  const desconto = coupon.type === "percent" ? Math.round(amountCents * (coupon.value / 100)) : coupon.value;
  return Math.max(0, Math.min(amountCents, desconto));
}
