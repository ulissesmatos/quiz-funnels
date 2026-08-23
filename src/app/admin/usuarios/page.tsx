import type { Metadata } from "next";

import { listUsersForAdmin } from "@/server/admin/users";

import { ToggleSuperAdmin } from "./toggle-super-admin";

export const metadata: Metadata = { title: "Usuários" };

type PageProps = { searchParams: Promise<{ busca?: string }> };

export default async function AdminUsersPage({ searchParams }: PageProps) {
  const { busca } = await searchParams;
  const users = await listUsersForAdmin(busca || undefined);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 md:px-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Usuários</h1>
          <p className="mt-1 text-sm text-app-muted">
            {users.length} {users.length === 1 ? "resultado" : "resultados"}.
          </p>
        </div>

        <form className="flex items-center gap-2" action="/admin/usuarios">
          <input
            type="search"
            name="busca"
            defaultValue={busca}
            placeholder="Buscar por nome ou e-mail"
            className="h-9 rounded-lg border border-app-border bg-app-surface px-3 text-sm text-app-text placeholder:text-app-muted focus:border-app-primary focus:outline-none"
          />
          <button
            type="submit"
            className="h-9 rounded-lg border border-app-border px-3 text-sm text-app-text hover:border-app-primary/60"
          >
            Buscar
          </button>
        </form>
      </header>

      <ul className="flex flex-col gap-2">
        {users.map((user) => (
          <li
            key={user.id}
            className="flex items-center justify-between gap-3 rounded-lg border border-app-border bg-app-surface px-3 py-2.5"
          >
            <div className="min-w-0">
              <p className="truncate text-sm text-app-text">{user.name}</p>
              <p className="truncate text-xs text-app-muted">
                {user.email} · {user.organizations.length > 0 ? user.organizations.join(", ") : "sem organização"}
              </p>
            </div>
            <ToggleSuperAdmin userId={user.id} isSuperAdmin={user.isSuperAdmin} />
          </li>
        ))}
      </ul>
    </div>
  );
}
