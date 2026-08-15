import type { Metadata } from "next";

import { requireOrganization } from "@/server/auth/session";
import { getOrganizationSettings } from "@/server/settings/queries";

import { ThemeModeForm } from "./theme-mode-form";

export const metadata: Metadata = { title: "Configurações" };

export default async function ConfiguracoesPage() {
  await requireOrganization();
  const { defaultThemeMode } = await getOrganizationSettings();

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 md:px-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Configurações</h1>
        <p className="mt-1 text-sm text-app-muted">Preferências gerais desta organização.</p>
      </header>

      <section className="rounded-2xl border border-app-border bg-app-surface p-5">
        <h2 className="font-medium">Aparência dos funis</h2>
        <p className="mt-1 text-sm text-app-muted">
          Modo padrão de cor para funis criados a partir de agora. Cada funil pode trocar o seu
          individualmente na aba Tema do editor, sem afetar os outros.
        </p>
        <div className="mt-4">
          <ThemeModeForm inicial={defaultThemeMode} />
        </div>
      </section>
    </div>
  );
}
