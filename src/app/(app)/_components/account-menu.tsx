"use client";

import { ChevronsUpDown, LogOut, Settings2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { cn } from "@/lib/cn";
import { authClient } from "@/lib/auth-client";

/**
 * Rodapé de conta: avatar + nome + org, com um menu (`<details>`, mesmo
 * padrão nativo do FAQ da landing — sem dependência nova) pra configurações e
 * sair. Recolhido, mostra só o avatar; o menu abre pra cima porque é o rodapé
 * do sidebar, não tem espaço abaixo.
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
  collapsed: boolean;
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
    <details className="group relative">
      <summary
        className={cn(
          "flex cursor-pointer list-none items-center gap-2 rounded-lg p-2 hover:bg-app-surface-2",
          collapsed && "md:justify-center md:px-0",
        )}
      >
        <Avatar name={userName} image={userImage} />
        <span className={cn("min-w-0 flex-1 text-left", collapsed && "md:hidden")}>
          <span className="block truncate text-sm font-medium">{userName}</span>
          <span className="block truncate text-xs text-app-muted">{organizationName}</span>
        </span>
        <ChevronsUpDown size={14} className={cn("shrink-0 text-app-muted", collapsed && "md:hidden")} />
      </summary>

      <div className="absolute bottom-full left-0 z-50 mb-1 w-64 rounded-xl border border-app-border bg-app-surface-2 p-1.5 shadow-xl">
        <div className="flex items-center gap-2 px-2 py-2">
          <Avatar name={userName} image={userImage} />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{userName}</p>
            <p className="truncate text-xs text-app-muted">{userEmail}</p>
          </div>
        </div>

        <div className="my-1 border-t border-app-border" />

        <Link
          href="/configuracoes"
          className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-app-text hover:bg-app-surface"
        >
          <Settings2 size={16} />
          Configurações
        </Link>

        <button
          type="button"
          disabled={pending}
          onClick={sair}
          className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-app-danger hover:bg-app-surface disabled:opacity-50"
        >
          <LogOut size={16} />
          Sair
        </button>
      </div>
    </details>
  );
}

function Avatar({ name, image }: { name: string; image: string | null }) {
  if (image) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={image} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />;
  }

  const inicial = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-app-primary text-sm font-semibold text-white">
      {inicial}
    </span>
  );
}
