import "server-only";

import { eq } from "drizzle-orm";
import { cache } from "react";

import type { ThemeMode } from "@/funnel/schema/theme";
import { getActiveOrganization } from "@/server/auth/session";
import { db } from "@/server/db";
import { organizationSettings } from "@/server/db/schema";

export type OrganizationSettings = {
  defaultThemeMode: ThemeMode;
};

/** Sem linha gravada ainda, o padrão é escuro — mesmo padrão de sempre. */
export const getOrganizationSettings = cache(async (): Promise<OrganizationSettings> => {
  const org = await getActiveOrganization();
  if (!org) return { defaultThemeMode: "dark" };

  const [row] = await db
    .select({ defaultThemeMode: organizationSettings.defaultThemeMode })
    .from(organizationSettings)
    .where(eq(organizationSettings.organizationId, org.id))
    .limit(1);

  return { defaultThemeMode: (row?.defaultThemeMode as ThemeMode) ?? "dark" };
});
