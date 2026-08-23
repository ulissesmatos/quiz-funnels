import { LayoutGrid, ShieldAlert, Settings, UserCog, Users } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { requireOrganization } from "@/server/auth/session";
import { getOrganizationSubscription, isEditingBlocked } from "@/server/billing/queries";
import { stopImpersonationAction } from "@/server/admin/actions";
import { getOrganizationSettings } from "@/server/settings/queries";
import { Logo } from "@/components/brand/logo";

import { SignOutButton } from "./_components/sign-out-button";

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
      <aside className="flex shrink-0 items-center gap-4 border-b border-app-border bg-app-surface px-4 py-3 md:w-60 md:flex-col md:items-stretch md:gap-1 md:border-r md:border-b-0 md:px-3 md:py-4">
        <Link href="/funis" className="flex items-center gap-2 md:mb-4 md:px-2">
          <Logo className="h-8 w-8 shrink-0" />
          <span className="font-semibold">FunilQuiz</span>
        </Link>

        <nav className="flex flex-1 gap-1 md:flex-col">
          <NavLink href="/funis" icon={<LayoutGrid size={16} />}>
            Meus funis
          </NavLink>
          <NavLink href="/leads" icon={<Users size={16} />}>
            Leads
          </NavLink>
          <NavLink href="/equipe" icon={<UserCog size={16} />}>
            Equipe
          </NavLink>
          <NavLink href="/configuracoes" icon={<Settings size={16} />}>
            Configurações
          </NavLink>
          {session.user.isSuperAdmin && (
            <NavLink href="/admin" icon={<ShieldAlert size={16} />}>
              Admin
            </NavLink>
          )}
        </nav>

        <div className="md:mt-auto md:border-t md:border-app-border md:pt-3">
          <div className="hidden px-2 pb-2 md:block">
            <p className="truncate text-sm font-medium">{session.user.name}</p>
            <p className="truncate text-xs text-app-muted">{organization.name}</p>
          </div>
          <SignOutButton />
        </div>
      </aside>

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

function NavLink({
  href,
  icon,
  children,
}: {
  href: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-app-muted transition-colors hover:bg-app-surface-2 hover:text-app-text"
    >
      {icon}
      {children}
    </Link>
  );
}
