import type { Metadata } from "next";

import { requireOrganization } from "@/server/auth/session";

import { TeamManager } from "./team-manager";

export const metadata: Metadata = { title: "Equipe" };

export default async function EquipePage() {
  const { session, organization } = await requireOrganization();

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 md:px-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Equipe</h1>
        <p className="mt-1 text-sm text-app-muted">
          Quem tem acesso a &ldquo;{organization.name}&rdquo; e o que cada papel pode fazer.
        </p>
      </header>

      <TeamManager currentUserId={session.user.id} currentRole={organization.role} />
    </div>
  );
}
