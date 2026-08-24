import type { Metadata } from "next";

import { PageShell } from "@/components/ui/page-shell";
import { requireOrganization } from "@/server/auth/session";

import { AcceptInvitation } from "./accept-invitation";

export const metadata: Metadata = { title: "Convite" };

type PageProps = { params: Promise<{ id: string }> };

/**
 * `requireOrganization()` aqui não é sobre a organização do convite — é só o
 * jeito mais barato de exigir sessão (todo mundo já tem uma org pessoal desde
 * o cadastro, então nunca falha por causa disso). Sem e-mail transacional
 * ainda, quem recebe o link por fora e não tem conta cai aqui, é mandado pro
 * login, e — como o login hoje sempre volta pra `/funis` — precisa reabrir
 * este link depois de entrar. Não é redirecionamento contínuo, mas funciona.
 */
export default async function ConvitePage({ params }: PageProps) {
  const { id } = await params;
  await requireOrganization();

  return (
    <PageShell width="sm" className="max-w-md py-16">
      <AcceptInvitation invitationId={id} />
    </PageShell>
  );
}
