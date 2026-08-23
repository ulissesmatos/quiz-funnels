"use client";

import { LayoutGrid, ShieldAlert, Settings, UserCog, Users } from "lucide-react";
import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { Sidebar, SidebarFooter, SidebarHeader, SidebarNav, type SidebarNavItem } from "@/components/ui/sidebar";

import { SignOutButton } from "./sign-out-button";

export function AppSidebar({
  userName,
  organizationName,
  isSuperAdmin,
}: {
  userName: string;
  organizationName: string;
  isSuperAdmin: boolean;
}) {
  const items: SidebarNavItem[] = [
    { href: "/funis", label: "Meus funis", icon: <LayoutGrid size={16} /> },
    { href: "/leads", label: "Leads", icon: <Users size={16} /> },
    { href: "/equipe", label: "Equipe", icon: <UserCog size={16} /> },
    { href: "/configuracoes", label: "Configurações", icon: <Settings size={16} /> },
    ...(isSuperAdmin ? [{ href: "/admin", label: "Admin", icon: <ShieldAlert size={16} /> }] : []),
  ];

  return (
    <Sidebar>
      <SidebarHeader>
        <Link href="/funis" className="flex items-center gap-2">
          <Logo className="h-8 w-8 shrink-0" />
          <span className="font-semibold">FunilQuiz</span>
        </Link>
      </SidebarHeader>

      <SidebarNav items={items} />

      <SidebarFooter>
        <div className="hidden px-2 pb-2 md:block">
          <p className="truncate text-sm font-medium">{userName}</p>
          <p className="truncate text-xs text-app-muted">{organizationName}</p>
        </div>
        <SignOutButton />
      </SidebarFooter>
    </Sidebar>
  );
}
