"use server";

import { revalidatePath } from "next/cache";

import type { ThemeMode } from "@/funnel/schema/theme";
import { requireOrganization } from "@/server/auth/session";
import { db } from "@/server/db";
import { organizationSettings } from "@/server/db/schema";
import type { ActionResult } from "@/server/shared/action-result";

/**
 * Modo de cor (claro/escuro/automático) do painel e do editor desta
 * organização. Também semeia o tema de todo funil novo — que pode trocar o
 * seu depois, na aba Tema, sem afetar os outros nem esta preferência.
 */
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
