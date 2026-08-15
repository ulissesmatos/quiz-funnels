"use server";

import { revalidatePath } from "next/cache";

import type { ThemeMode } from "@/funnel/schema/theme";
import { requireOrganization } from "@/server/auth/session";
import { db } from "@/server/db";
import { organizationSettings } from "@/server/db/schema";

export type ActionResult = { ok: true } | { ok: false; error: string };

/** Padrão de modo (claro/escuro/automático) pra funil novo. Cada funil ainda pode trocar o seu depois. */
export async function updateDefaultThemeModeAction(mode: ThemeMode): Promise<ActionResult> {
  const { organization } = await requireOrganization();

  await db
    .insert(organizationSettings)
    .values({ organizationId: organization.id, defaultThemeMode: mode })
    .onConflictDoUpdate({
      target: organizationSettings.organizationId,
      set: { defaultThemeMode: mode, updatedAt: new Date() },
    });

  revalidatePath("/configuracoes");
  return { ok: true };
}
