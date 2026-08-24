import { cookies } from "next/headers";
import type { ReactNode } from "react";

import { requireSuperAdmin } from "@/server/auth/session";

import { AdminSidebar } from "./_components/admin-sidebar";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireSuperAdmin();
  const cookieStore = await cookies();

  return (
    <div className="flex min-h-dvh flex-col bg-app-bg text-app-text md:flex-row">
      <AdminSidebar defaultCollapsed={cookieStore.get("sidebar-collapsed")?.value === "1"} />
      <main className="flex-1 overflow-x-hidden">{children}</main>
    </div>
  );
}
