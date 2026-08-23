import Link from "next/link";
import type { ReactNode } from "react";

import { requireOrganization } from "@/server/auth/session";
import { getOrganizationSubscription, isEditingBlocked } from "@/server/billing/queries";
import { stopImpersonationAction } from "@/server/admin/actions";
import { getOrganizationSettings } from "@/server/settings/queries";

import { AppSidebar } from "./_components/app-sidebar";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const { session, organization } = await requireOrganization();
  const [{ defaultThemeMode }, subscription] = await Promise.all([
    getOrganizationSettings(),
    getOrganizationSubscription(organization.id),
  ]);

  const bloqueado = isEditingBlocked(subscription);

  return (
    <div
      data-app-theme={defaultThemeMode}
      className="flex min-h-dvh flex-col bg-app-bg text-app-text md:flex-row"
    >
      <AppSidebar
        userName={session.user.name}
        organizationName={organization.name}
        isSuperAdmin={session.user.isSuperAdmin}
      />

      <main className="flex-1 overflow-x-hidden">
        {organization.impersonating && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-app-border bg-app-primary/15 px-4 py-2 text-sm">
            <span>
              Operando como <strong>{organization.name}</strong> via impersonate.
            </span>
            <form action={stopImpersonationAction}>
              <button type="submit" className="underline hover:no-underline">
                Sair do impersonate
              </button>
            </form>
          </div>
        )}

        {bloqueado && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-app-border bg-app-danger/15 px-4 py-2 text-sm text-app-danger">
            <span>Assinatura pendente — a edição dos funis está bloqueada até regularizar o pagamento.</span>
            <Link href="/configuracoes" className="underline hover:no-underline">
              Resolver agora
            </Link>
          </div>
        )}

        {children}
      </main>
    </div>
  );
}
