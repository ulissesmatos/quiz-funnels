"use client";

import { X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { Field, Input, Select } from "@/components/ui/field";
import { ListRow, ListRowActions, ListRowMain } from "@/components/ui/list-row";
import { Avatar, SectionLabel, Skeleton } from "@/components/ui/misc";
import { authClient } from "@/lib/auth-client";

type Papel = "owner" | "admin" | "member";

type Membro = {
  id: string;
  userId: string;
  role: string;
  user: { name: string; email: string };
};

type Convite = {
  id: string;
  email: string;
  role: string | null;
  status: string;
  expiresAt: string | Date;
};

const RÓTULOS_DE_PAPEL: Record<string, string> = {
  owner: "Dono",
  admin: "Admin",
  member: "Membro",
};

/**
 * Sem envio de e-mail transacional ainda (fica pra quando o Resend entrar) —
 * depois de convidar, mostramos o link pra quem convidou compartilhar por
 * fora (WhatsApp, etc.), em vez de fingir que o convite já chegou por e-mail.
 */
export function TeamManager({
  currentUserId,
  currentRole,
  organizationId,
  canUseTeam,
}: {
  currentUserId: string;
  currentRole: string;
  organizationId: string;
  /** Feature do plano da organização — sem ela, nem quem pode gerenciar vê o formulário de convite. */
  canUseTeam: boolean;
}) {
  const [membros, setMembros] = useState<Membro[] | null>(null);
  const [convites, setConvites] = useState<Convite[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const podeGerenciar = currentRole === "owner" || currentRole === "admin";

  // `useCallback` porque agora fecha sobre `organizationId` e é passada como
  // callback pros filhos — sem isso ela muda de identidade a cada render.
  const recarregar = useCallback(async () => {
    setErro(null);
    const [membrosResult, convitesResult] = await Promise.all([
      authClient.organization.listMembers({ query: { organizationId } }),
      authClient.organization.listInvitations({ query: { organizationId } }),
    ]);

    if (membrosResult.error) {
      setErro(traduzErroOrg(membrosResult.error.code));
      // Sem isto a lista fica em `null` pra sempre e o esqueleto de
      // carregamento nunca sai da tela, escondendo o erro logo acima.
      setMembros([]);
      return;
    }
    setMembros(membrosResult.data.members as Membro[]);

    if (!convitesResult.error) {
      setConvites((convitesResult.data as Convite[]).filter((c) => c.status === "pending"));
    }
  }, [organizationId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- busca inicial de dado externo (API do Better Auth), não sincronização com outro estado local
    void recarregar();
  }, [recarregar]);

  return (
    <div className="flex flex-col gap-6">
      {podeGerenciar &&
        (canUseTeam ? (
          <ConvidarForm organizationId={organizationId} onConvidado={recarregar} />
        ) : (
          <Alert tone="warning">
            Seu plano atual não inclui convite de equipe — faça upgrade em Configurações para adicionar mais gente.
          </Alert>
        ))}

      {erro && <Alert tone="danger">{erro}</Alert>}

      <section>
        <SectionLabel>Membros</SectionLabel>
        {membros === null ? (
          // Esqueleto no lugar do spinner solto: mantém a altura da lista e o
          // layout não pula quando os membros chegam.
          <ul className="flex flex-col gap-2">
            {[0, 1].map((i) => (
              <li key={i}>
                <Skeleton className="h-[58px] w-full" />
              </li>
            ))}
          </ul>
        ) : (
          <ul className="flex flex-col gap-2">
            {membros.map((membro) => (
              <MembroRow
                key={membro.id}
                membro={membro}
                souEu={membro.userId === currentUserId}
                podeGerenciar={podeGerenciar}
                organizationId={organizationId}
                onMudou={recarregar}
              />
            ))}
          </ul>
        )}
      </section>

      {podeGerenciar && convites !== null && convites.length > 0 && (
        <section>
          <SectionLabel>Convites pendentes</SectionLabel>
          <ul className="flex flex-col gap-2">
            {convites.map((convite) => (
              <ConviteRow key={convite.id} convite={convite} onCancelado={recarregar} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function ConvidarForm({ organizationId, onConvidado }: { organizationId: string; onConvidado: () => void }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Papel>("member");
  const [pending, setPending] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setLink(null);
    setPending(true);

    const result = await authClient.organization.inviteMember({ email, role, organizationId });

    setPending(false);

    if (result.error) {
      setErro(traduzErroOrg(result.error.code));
      return;
    }

    setEmail("");
    setLink(`${window.location.origin}/convite/${result.data.id}`);
    onConvidado();
  }

  return (
    <Card padding="sm">
      <form onSubmit={enviar}>
        <h2 className="text-sm font-medium">Convidar alguém</h2>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Field label="E-mail">
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="pessoa@email.com"
              />
            </Field>
          </div>

          <Field label="Papel">
            <Select value={role} onChange={(e) => setRole(e.target.value as Papel)}>
              <option value="member">Membro</option>
              <option value="admin">Admin</option>
            </Select>
          </Field>

          <Button type="submit" loading={pending} disabled={!email.trim()}>
            Convidar
          </Button>
        </div>

        {erro && <p className="mt-2 text-xs text-app-danger">{erro}</p>}

        {link && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-app-surface-2 px-3 py-2 text-xs">
            <span className="min-w-0 flex-1 truncate text-app-muted">
              Ainda não enviamos e-mail automático — copie e mande este link pra pessoa: {link}
            </span>
            <CopyButton value={link} />
          </div>
        )}
      </form>
    </Card>
  );
}

function MembroRow({
  membro,
  souEu,
  podeGerenciar,
  organizationId,
  onMudou,
}: {
  membro: Membro;
  souEu: boolean;
  podeGerenciar: boolean;
  organizationId: string;
  onMudou: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function mudarPapel(novoPapel: string) {
    setPending(true);
    setErro(null);
    const result = await authClient.organization.updateMemberRole({
      memberId: membro.id,
      role: novoPapel,
      organizationId,
    });
    setPending(false);
    if (result.error) setErro(traduzErroOrg(result.error.code));
    else onMudou();
  }

  async function remover() {
    setPending(true);
    setErro(null);
    const result = await authClient.organization.removeMember({
      memberIdOrEmail: membro.userId,
      organizationId,
    });
    setPending(false);
    if (result.error) setErro(traduzErroOrg(result.error.code));
    else onMudou();
  }

  const podeMudarEsteMembro = podeGerenciar && membro.role !== "owner";

  return (
    <ListRow pending={pending}>
      <Avatar name={membro.user.name} size={32} className="text-sm" />

      <ListRowMain
        title={
          <>
            {membro.user.name} {souEu && <span className="font-normal text-app-muted">(você)</span>}
          </>
        }
      >
        <span className="block truncate">{membro.user.email}</span>
        {erro && <span className="mt-1 block text-app-danger">{erro}</span>}
      </ListRowMain>

      <ListRowActions>
        {podeMudarEsteMembro ? (
          <Select
            value={membro.role}
            disabled={pending}
            aria-label={`Papel de ${membro.user.name}`}
            onChange={(e) => void mudarPapel(e.target.value)}
            className="h-8 w-auto pr-8 pl-2.5 text-xs"
          >
            <option value="member">Membro</option>
            <option value="admin">Admin</option>
          </Select>
        ) : (
          <span className="text-xs text-app-muted">{RÓTULOS_DE_PAPEL[membro.role] ?? membro.role}</span>
        )}

        {podeGerenciar && !souEu && membro.role !== "owner" && (
          <Button
            variant="ghost-danger"
            size="icon-sm"
            aria-label={`Remover ${membro.user.name} da organização`}
            title="Remover da organização"
            disabled={pending}
            onClick={() => void remover()}
          >
            <X size={14} />
          </Button>
        )}
      </ListRowActions>
    </ListRow>
  );
}

function ConviteRow({ convite, onCancelado }: { convite: Convite; onCancelado: () => void }) {
  const [pending, setPending] = useState(false);

  async function cancelar() {
    setPending(true);
    await authClient.organization.cancelInvitation({ invitationId: convite.id });
    setPending(false);
    onCancelado();
  }

  return (
    <ListRow pending={pending} className="border-dashed bg-transparent">
      <ListRowMain title={convite.email}>
        {RÓTULOS_DE_PAPEL[convite.role ?? "member"] ?? convite.role}
      </ListRowMain>

      <ListRowActions>
        <Button variant="ghost" size="sm" disabled={pending} onClick={() => void cancelar()}>
          Cancelar
        </Button>
      </ListRowActions>
    </ListRow>
  );
}

function traduzErroOrg(code?: string): string {
  switch (code) {
    case "USER_IS_ALREADY_A_MEMBER_OF_THIS_ORGANIZATION":
      return "Essa pessoa já faz parte da organização.";
    case "USER_IS_ALREADY_INVITED_TO_THIS_ORGANIZATION":
      return "Já existe um convite pendente para este e-mail.";
    case "YOU_CANNOT_LEAVE_THE_ORGANIZATION_AS_THE_ONLY_OWNER":
      return "Não é possível remover o único dono da organização.";
    case "YOU_ARE_NOT_ALLOWED_TO_DELETE_THIS_MEMBER":
    case "YOU_ARE_NOT_ALLOWED_TO_UPDATE_THIS_MEMBER":
      return "Você não tem permissão para esta ação.";
    case "MEMBER_NOT_FOUND":
      return "Este membro não existe mais.";
    case "ORGANIZATION_MEMBERSHIP_LIMIT_REACHED":
      return "Limite de membros da organização atingido.";
    case "INVITATION_LIMIT_REACHED":
      return "Limite de convites pendentes atingido.";
    default:
      return "Não foi possível concluir. Tente novamente.";
  }
}
