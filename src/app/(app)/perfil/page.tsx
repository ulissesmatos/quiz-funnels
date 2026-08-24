import type { Metadata } from "next";

import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { PageHeader, PageShell } from "@/components/ui/page-shell";
import { requireOrganization } from "@/server/auth/session";

import { PasswordForm } from "./password-form";
import { ProfileForm } from "./profile-form";

export const metadata: Metadata = { title: "Perfil" };

export default async function PerfilPage() {
  const { session } = await requireOrganization();

  return (
    <PageShell width="sm">
      <PageHeader title="Perfil" description="Suas informações pessoais — o que muda aqui é só sobre você, não sobre a organização." />

      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader title="Foto e nome" />
          <ProfileForm nomeInicial={session.user.name} imagemInicial={session.user.image ?? null} />
        </Card>

        <Card>
          <CardHeader title="E-mail" description="Trocar o e-mail de login ainda não está disponível." />
          <div className="flex items-center gap-2 text-sm">
            <span className="text-app-text">{session.user.email}</span>
            <Badge tone={session.user.emailVerified ? "success" : "neutral"} dot>
              {session.user.emailVerified ? "Verificado" : "Não verificado"}
            </Badge>
          </div>
        </Card>

        <Card>
          <CardHeader title="Senha" description="Só você vê esta seção — precisa confirmar a senha atual pra trocar." />
          <PasswordForm />
        </Card>
      </div>
    </PageShell>
  );
}
