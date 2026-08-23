"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { requireOrganization } from "@/server/auth/session";
import { db } from "@/server/db";
import { mercadoPagoConnections } from "@/server/db/schema";
import type { ActionResult } from "@/server/shared/action-result";

export async function disconnectMercadoPagoAction(): Promise<ActionResult> {
  const { organization } = await requireOrganization();

  await db.delete(mercadoPagoConnections).where(eq(mercadoPagoConnections.organizationId, organization.id));

  revalidatePath("/configuracoes");
  return { ok: true };
}
