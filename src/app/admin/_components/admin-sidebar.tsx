"use client";

import { AlertTriangle, ArrowLeft, CreditCard, LayoutDashboard, ScrollText, ShieldAlert, UsersRound } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import {
  MobileTopBar,
  Sidebar,
  SidebarFooter,
  SidebarHeader,
  SidebarNav,
  SidebarToggle,
  type SidebarNavItem,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/cn";

const COLLAPSE_COOKIE = "sidebar-collapsed";

const ITEMS: SidebarNavItem[] = [
  { href: "/admin", label: "Dashboard", icon: <LayoutDashboard size={16} className="shrink-0" /> },
  { href: "/admin/organizacoes", label: "Organizações", icon: <ShieldAlert size={16} className="shrink-0" /> },
  { href: "/admin/planos", label: "Planos", icon: <CreditCard size={16} className="shrink-0" /> },
  { href: "/admin/usuarios", label: "Usuários", icon: <UsersRound size={16} className="shrink-0" /> },
  { href: "/admin/auditoria", label: "Auditoria", icon: <ScrollText size={16} className="shrink-0" /> },
  { href: "/admin/erros", label: "Erros", icon: <AlertTriangle size={16} className="shrink-0" /> },
];

/**
 * Mesmo chrome do sidebar do app (`ui/sidebar.tsx`) — só a lista de itens e a
 * marca mudam. Antes o admin tinha uma implementação própria, hand-rolled;
 * agora os dois consomem o mesmo componente, então recolher/expandir,
 * a gaveta do celular e o comportamento de foco vêm de graça e não podem
 * divergir de um lugar pro outro.
 */
export function AdminSidebar({ defaultCollapsed }: { defaultCollapsed: boolean }) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  function toggle() {
    const proximo = !collapsed;
    setCollapsed(proximo);
    document.cookie = `${COLLAPSE_COOKIE}=${proximo ? "1" : "0"}; path=/; max-age=31536000; samesite=lax`;
  }

  const marca = (
    <div className="flex min-w-0 items-center gap-2">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-app-danger text-sm font-bold text-white">
        A
      </span>
      <span className="truncate font-semibold">Painel do operador</span>
    </div>
  );

  const voltar = (
    <Link
      href="/funis"
      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-app-muted transition-colors duration-150 ease-app hover:bg-app-surface-2 hover:text-app-text"
    >
      <ArrowLeft size={16} className="shrink-0" />
      Voltar pro app
    </Link>
  );

  return (
    <>
      {/* Celular: barra compacta + gaveta. */}
      <MobileTopBar brand={marca}>
        {(fechar) => (
          <>
            <SidebarNav items={ITEMS} onNavigate={fechar} />
            <SidebarFooter>{voltar}</SidebarFooter>
          </>
        )}
      </MobileTopBar>

      {/* Desktop: coluna fixa, recolhível. */}
      <Sidebar collapsed={collapsed}>
        <SidebarToggle collapsed={collapsed} onToggle={toggle} />

        <SidebarHeader>
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-app-danger text-sm font-bold text-white">
            A
          </span>
          <span className={cn("truncate font-semibold", collapsed && "md:hidden")}>Painel do operador</span>
        </SidebarHeader>

        <SidebarNav items={ITEMS} collapsed={collapsed} />

        <SidebarFooter>{voltar}</SidebarFooter>
      </Sidebar>
    </>
  );
}
