"use client";

import { LayoutGrid, ShieldAlert, Settings, UserCog, Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Logo } from "@/components/brand/logo";
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

import { AccountMenu } from "./account-menu";

const COLLAPSE_COOKIE = "sidebar-collapsed";

export function AppSidebar({
  userName,
  userEmail,
  userImage,
  organizationName,
  isSuperAdmin,
  defaultCollapsed,
}: {
  userName: string;
  userEmail: string;
  userImage: string | null;
  organizationName: string;
  isSuperAdmin: boolean;
  defaultCollapsed: boolean;
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  function toggle() {
    const proximo = !collapsed;
    setCollapsed(proximo);
    // Sem servidor envolvido de propósito — é preferência de UI por dispositivo,
    // não dado de organização. Cookie (não localStorage) só pra o layout ler no
    // servidor e renderizar já no estado certo, sem flash no refresh.
    document.cookie = `${COLLAPSE_COOKIE}=${proximo ? "1" : "0"}; path=/; max-age=31536000; samesite=lax`;
  }

  const items: SidebarNavItem[] = [
    { href: "/funis", label: "Meus funis", icon: <LayoutGrid size={16} className="shrink-0" /> },
    { href: "/leads", label: "Leads", icon: <Users size={16} className="shrink-0" /> },
    { href: "/equipe", label: "Equipe", icon: <UserCog size={16} className="shrink-0" /> },
    { href: "/configuracoes", label: "Configurações", icon: <Settings size={16} className="shrink-0" /> },
    ...(isSuperAdmin ? [{ href: "/admin", label: "Admin", icon: <ShieldAlert size={16} className="shrink-0" /> }] : []),
  ];

  const conta = (
    <AccountMenu
      userName={userName}
      userEmail={userEmail}
      userImage={userImage}
      organizationName={organizationName}
    />
  );

  const marca = (
    <Link href="/funis" className="flex min-w-0 items-center gap-2">
      <Logo className="h-8 w-8 shrink-0" />
      <span className="truncate font-semibold">FunilQuiz</span>
    </Link>
  );

  return (
    <>
      {/* Celular: barra compacta + gaveta. */}
      <MobileTopBar brand={marca}>
        {(fechar) => (
          <>
            <SidebarNav items={items} onNavigate={fechar} />
            <SidebarFooter>{conta}</SidebarFooter>
          </>
        )}
      </MobileTopBar>

      {/* Desktop: coluna fixa, recolhível. */}
      <Sidebar collapsed={collapsed}>
        <SidebarToggle collapsed={collapsed} onToggle={toggle} />

        <SidebarHeader>
          <Link href="/funis" className="flex min-w-0 flex-1 items-center gap-2">
            <Logo className="h-8 w-8 shrink-0" />
            <span className={cn("truncate font-semibold", collapsed && "md:hidden")}>FunilQuiz</span>
          </Link>
        </SidebarHeader>

        <SidebarNav items={items} collapsed={collapsed} />

        <SidebarFooter>
          <AccountMenu
            userName={userName}
            userEmail={userEmail}
            userImage={userImage}
            organizationName={organizationName}
            collapsed={collapsed}
          />
        </SidebarFooter>
      </Sidebar>
    </>
  );
}
