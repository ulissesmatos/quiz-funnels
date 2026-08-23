import "server-only";

import { desc, eq } from "drizzle-orm";

import { db } from "@/server/db";
import { coupons, funnels } from "@/server/db/schema";

export type CouponListItem = {
  id: string;
  code: string;
  type: "percent" | "fixed";
  value: number;
  funnelId: string | null;
  funnelName: string | null;
  maxUses: number | null;
  usedCount: number;
  expiresAt: Date | null;
  active: boolean;
  createdAt: Date;
};

export async function listCoupons(organizationId: string): Promise<CouponListItem[]> {
  const rows = await db
    .select({
      id: coupons.id,
      code: coupons.code,
      type: coupons.type,
      value: coupons.value,
      funnelId: coupons.funnelId,
      funnelName: funnels.name,
      maxUses: coupons.maxUses,
      usedCount: coupons.usedCount,
      expiresAt: coupons.expiresAt,
      active: coupons.active,
      createdAt: coupons.createdAt,
    })
    .from(coupons)
    .leftJoin(funnels, eq(coupons.funnelId, funnels.id))
    .where(eq(coupons.organizationId, organizationId))
    .orderBy(desc(coupons.createdAt));

  return rows;
}
