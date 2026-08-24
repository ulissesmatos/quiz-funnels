"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { authClient } from "@/lib/auth-client";

type DetalheDoConvite = {
  id: string;
  email: string;
  role: string | null;
  status: string;
  organizationName?: string;
};

export function AcceptInvitation({ invitationId }: { invitationId: string }) {
  const router = useRouter();
  const [convite, setConvite] = useState<DetalheDoConvite | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [processando, setProcessando] = useState(false);
  const [resultado, setResultado] = useState<"aceito" | "recusado" | null>(null);

  useEffect(() => {
    async function carregar() {
      const result = await authClient.organization.getInvitation({ query: { id: invitationId } });
      if (result.error) {
        setErro(traduzErroConvite(result.error.code));
        return;
      }
      setConvite(result.data as DetalheDoConvite);
    }
    void carregar();
  }, [invitationId]);

  async function aceitar() {
    setProcessando(true);
    setErro(null);

    const result = await authClient.organization.acceptInvitation({ invitationId });
    if (result.error) {
      setProcessando(false);
      setErro(traduzErroConvite(result.error.code));
      return;
    }

    // Entra direto na organização que acabou de aceitar — sem isto, a pessoa
    // aceitaria o convite mas continuaria vendo os funis da org anterior.
    const organizationId = result.data.invitation.organizationId;
    if (organizationId) await authClient.organization.setActive({ organizationId });

    setResultado("aceito");
    router.push("/funis");
    router.refresh();
  }

  async function recusar() {
    setProcessando(true);
    setErro(null);

    const result = await authClient.organization.rejectInvitation({ invitationId });
    setProcessando(false);

    if (result.error) {
      setErro(traduzErroConvite(result.error.code));
      return;
    }
    setResultado("recusado");
  }

  if (erro) {
    return (
      <Card className="text-center">
        <p className="text-sm text-app-danger">{erro}</p>
      </Card>
    );
  }

  if (resultado === "recusado") {
    return (
      <Card className="text-center">
        <p className="text-sm text-app-muted">Convite recusado.</p>
      </Card>
    );
  }

  if (!convite) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 size={20} className="animate-spin text-app-muted" />
      </div>
    );
  }

  return (
    <Card className="text-center">
      <h1 className="font-serif text-lg font-semibold">Convite para {convite.organizationName ?? "uma organização"}</h1>
      <p className="mt-1 text-sm text-app-muted">
        Você foi convidado como <strong className="text-app-text">{RÓTULOS_DE_PAPEL[convite.role ?? "member"] ?? convite.role}</strong>.
      </p>

      <div className="mt-5 flex justify-center gap-2">
        <Button variant="outline" disabled={processando} onClick={() => void recusar()}>
          Recusar
        </Button>
        <Button disabled={processando} onClick={() => void aceitar()}>
          {processando ? <Loader2 size={14} className="animate-spin" /> : "Aceitar convite"}
        </Button>
      </div>
    </Card>
  );
}

const RÓTULOS_DE_PAPEL: Record<string, string> = {
  owner: "Dono",
  admin: "Admin",
  member: "Membro",
};

function traduzErroConvite(code?: string): string {
  switch (code) {
    case "INVITATION_NOT_FOUND":
      return "Este convite não existe mais — pode já ter sido usado ou cancelado.";
    case "YOU_ARE_NOT_THE_RECIPIENT_OF_THE_INVITATION":
      return "Este convite foi enviado para outro e-mail. Entre com a conta correta para aceitar.";
    case "EMAIL_VERIFICATION_REQUIRED_BEFORE_ACCEPTING_OR_REJECTING_INVITATION":
    case "EMAIL_VERIFICATION_REQUIRED_FOR_INVITATION":
      return "Confirme seu e-mail antes de aceitar este convite.";
    default:
      return "Não foi possível carregar este convite.";
  }
}
