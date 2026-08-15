import { LayoutGrid, Users } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { requireOrganization } from "@/server/auth/session";

import { SignOutButton } from "./_components/sign-out-button";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const { session, organization } = await requireOrganization();

  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <aside className="flex shrink-0 items-center gap-4 border-b border-app-border bg-app-surface px-4 py-3 md:w-60 md:flex-col md:items-stretch md:gap-1 md:border-r md:border-b-0 md:px-3 md:py-4">
        <Link href="/funis" className="flex items-center gap-2 md:mb-4 md:px-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-app-primary text-sm font-bold text-white">
            F
          </span>
          <span className="font-semibold">Funis</span>
        </Link>

        <nav className="flex flex-1 gap-1 md:flex-col">
          <NavLink href="/funis" icon={<LayoutGrid size={16} />}>
            Meus funis
          </NavLink>
          <NavLink href="/leads" icon={<Users size={16} />}>
            Leads
          </NavLink>
        </nav>

        <div className="md:mt-auto md:border-t md:border-app-border md:pt-3">
          <div className="hidden px-2 pb-2 md:block">
            <p className="truncate text-sm font-medium">{session.user.name}</p>
            <p className="truncate text-xs text-app-muted">{organization.name}</p>
          </div>
          <SignOutButton />
        </div>
      </aside>

      <main className="flex-1 overflow-x-hidden">{children}</main>
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
