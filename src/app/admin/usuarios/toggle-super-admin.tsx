"use client";

import { Loader2 } from "lucide-react";
import { useState, useTransition } from "react";

import { cn } from "@/lib/cn";
import { toggleSuperAdminAction } from "@/server/admin/actions";

export function ToggleSuperAdmin({ userId, isSuperAdmin }: { userId: string; isSuperAdmin: boolean }) {
  const [current, setCurrent] = useState(isSuperAdmin);
  const [pending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  function alternar() {
    setErro(null);
    const next = !current;
    startTransition(async () => {
      const result = await toggleSuperAdminAction(userId, next);
      if (!result.ok) {
        setErro(result.error);
        return;
      }
      setCurrent(next);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={alternar}
        className={cn(
          "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs whitespace-nowrap",
          current ? "bg-app-danger/15 text-app-danger" : "bg-app-surface-2 text-app-muted",
        )}
      >
        {pending && <Loader2 size={11} className="animate-spin" />}
        {current ? "Super admin" : "Tornar super admin"}
      </button>
      {erro && <p className="text-xs text-app-danger">{erro}</p>}
    </div>
  );
}
