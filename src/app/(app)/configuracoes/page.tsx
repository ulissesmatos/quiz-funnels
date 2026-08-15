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
        <h2 className="font-medium">Aparência do sistema</h2>
        <p className="mt-1 text-sm text-app-muted">
          Modo de cor do painel e do editor — a interface que você usa para montar os funis, não os
          funis em si. Cada funil publicado tem o próprio tema, trocável na aba Tema do editor, e
          nasce nesse mesmo modo por padrão até alguém trocar.
        </p>
        <div className="mt-4">
          <ThemeModeForm inicial={defaultThemeMode} />
        </div>
      </section>
    </div>
  );
}
