import { AlertTriangle, ArrowLeft, LayoutDashboard, ScrollText, ShieldAlert, UsersRound } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { requireSuperAdmin } from "@/server/auth/session";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireSuperAdmin();

  return (
    <div className="flex min-h-dvh flex-col bg-app-bg text-app-text md:flex-row">
      <aside className="flex shrink-0 items-center gap-4 border-b border-app-border bg-app-surface px-4 py-3 md:w-60 md:flex-col md:items-stretch md:gap-1 md:border-r md:border-b-0 md:px-3 md:py-4">
        <div className="flex items-center gap-2 md:mb-4 md:px-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-app-danger text-sm font-bold text-white">
            A
          </span>
          <span className="font-semibold">Painel do operador</span>
        </div>

        <nav className="flex flex-1 gap-1 md:flex-col">
          <NavLink href="/admin" icon={<LayoutDashboard size={16} />}>
            Dashboard
          </NavLink>
          <NavLink href="/admin/organizacoes" icon={<ShieldAlert size={16} />}>
            Organizações
          </NavLink>
          <NavLink href="/admin/usuarios" icon={<UsersRound size={16} />}>
            Usuários
          </NavLink>
          <NavLink href="/admin/auditoria" icon={<ScrollText size={16} />}>
            Auditoria
          </NavLink>
          <NavLink href="/admin/erros" icon={<AlertTriangle size={16} />}>
            Erros
          </NavLink>
        </nav>

        <div className="md:mt-auto md:border-t md:border-app-border md:pt-3">
          <Link
            href="/funis"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-app-muted transition-colors hover:bg-app-surface-2 hover:text-app-text"
          >
            <ArrowLeft size={16} />
            Voltar pro app
          </Link>
        </div>
      </aside>

      <main className="flex-1 overflow-x-hidden">{children}</main>
    </div>
  );
}

function NavLink({ href, icon, children }: { href: string; icon: ReactNode; children: ReactNode }) {
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
