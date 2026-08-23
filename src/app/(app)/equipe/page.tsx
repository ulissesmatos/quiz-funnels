import type { Metadata } from "next";

import { PageHeader, PageShell } from "@/components/ui/page-shell";
import { requireOrganization } from "@/server/auth/session";

import { TeamManager } from "./team-manager";

export const metadata: Metadata = { title: "Equipe" };

export default async function EquipePage() {
  const { session, organization } = await requireOrganization();

  return (
    <PageShell width="sm">
      <PageHeader
        title="Equipe"
        description={`Quem tem acesso a “${organization.name}” e o que cada papel pode fazer.`}
      />

      {/* `organizationId` explícito: a sessão nem sempre tem
          `activeOrganizationId` (só é gravado quando alguém troca de
          organização de propósito), e sem ele a API do Better Auth recusa
          listar membros. O servidor já resolveu qual é a organização ativa. */}
      <TeamManager
        currentUserId={session.user.id}
        currentRole={organization.role}
        organizationId={organization.id}
      />
    </PageShell>
  );
}
