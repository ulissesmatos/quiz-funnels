import type { Metadata } from "next";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { ListRow, ListRowActions, ListRowMain } from "@/components/ui/list-row";
import { Avatar } from "@/components/ui/misc";
import { PageHeader, PageShell } from "@/components/ui/page-shell";
import { listUsersForAdmin } from "@/server/admin/users";

import { ToggleSuperAdmin } from "./toggle-super-admin";

export const metadata: Metadata = { title: "Usuários" };

type PageProps = { searchParams: Promise<{ busca?: string }> };

export default async function AdminUsersPage({ searchParams }: PageProps) {
  const { busca } = await searchParams;
  const users = await listUsersForAdmin(busca || undefined);

  return (
    <PageShell width="md">
      <PageHeader
        title="Usuários"
        description={`${users.length} ${users.length === 1 ? "resultado" : "resultados"}.`}
        action={
          <form className="flex items-center gap-2" action="/admin/usuarios">
            <Input
              type="search"
              name="busca"
              defaultValue={busca}
              placeholder="Buscar por nome ou e-mail"
              aria-label="Buscar usuário"
              className="h-9 w-60"
            />
            <Button type="submit" variant="outline" size="sm" className="h-9">
              Buscar
            </Button>
          </form>
        }
      />

      <ul className="flex flex-col gap-2">
        {users.map((user) => (
          <ListRow key={user.id}>
            <Avatar name={user.name} size={32} className="text-sm" />
            <ListRowMain title={user.name}>
              <span className="block truncate">
                {user.email} · {user.organizations.length > 0 ? user.organizations.join(", ") : "sem organização"}
              </span>
            </ListRowMain>
            <ListRowActions>
              <ToggleSuperAdmin userId={user.id} isSuperAdmin={user.isSuperAdmin} />
            </ListRowActions>
          </ListRow>
        ))}
      </ul>
    </PageShell>
  );
}
