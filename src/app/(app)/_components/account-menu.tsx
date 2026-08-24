"use client";

import { ChevronsUpDown, LogOut, Settings2, UserCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar } from "@/components/ui/misc";
import { cn } from "@/lib/cn";
import { authClient } from "@/lib/auth-client";

/**
 * Rodapé de conta: avatar + nome + org, com um menu de verdade (Radix
 * DropdownMenu — navegação por teclado, `role="menu"`, fecha no Escape) pra
 * configurações e sair. Abre pra cima porque é o rodapé do sidebar, sem
 * espaço abaixo. Recolhido, mostra só o avatar.
 */
export function AccountMenu({
  userName,
  userEmail,
  userImage,
  organizationName,
  collapsed,
}: {
  userName: string;
  userEmail: string;
  userImage: string | null;
  organizationName: string;
  /** Só existe no desktop: no celular a gaveta é sempre larga. */
  collapsed?: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function sair() {
    setPending(true);
    await authClient.signOut();
    router.push("/entrar");
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "flex w-full items-center gap-2 rounded-lg p-2 text-left transition-colors duration-150 ease-app hover:bg-app-surface-2",
          collapsed && "md:justify-center md:px-0",
        )}
      >
        <Avatar name={userName} image={userImage} />
        <span className={cn("min-w-0 flex-1 text-left", collapsed && "md:hidden")}>
          <span className="block truncate text-sm font-medium">{userName}</span>
          <span className="block truncate text-xs text-app-muted">{organizationName}</span>
        </span>
        <ChevronsUpDown size={14} className={cn("shrink-0 text-app-muted", collapsed && "md:hidden")} />
      </DropdownMenuTrigger>

      <DropdownMenuContent side="top" align="start" className="w-64">
        <div className="flex items-center gap-2 px-2.5 py-2">
          <Avatar name={userName} image={userImage} />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{userName}</p>
            <p className="truncate text-xs text-app-muted">{userEmail}</p>
          </div>
        </div>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link href="/perfil">
            <UserCircle size={16} />
            Perfil
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link href="/configuracoes">
            <Settings2 size={16} />
            Configurações
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem danger disabled={pending} onSelect={() => void sair()}>
          <LogOut size={16} />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
