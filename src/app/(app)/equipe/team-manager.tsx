"use client";

import { Check, Copy, Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/cn";

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
export function TeamManager({ currentUserId, currentRole }: { currentUserId: string; currentRole: string }) {
  const [membros, setMembros] = useState<Membro[] | null>(null);
  const [convites, setConvites] = useState<Convite[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const podeGerenciar = currentRole === "owner" || currentRole === "admin";

  async function recarregar() {
    setErro(null);
    const [membrosResult, convitesResult] = await Promise.all([
      authClient.organization.listMembers(),
      authClient.organization.listInvitations(),
    ]);

    if (membrosResult.error) {
      setErro(traduzErroOrg(membrosResult.error.code));
      return;
    }
    setMembros(membrosResult.data.members as Membro[]);

    if (!convitesResult.error) {
      setConvites((convitesResult.data as Convite[]).filter((c) => c.status === "pending"));
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- busca inicial de dado externo (API do Better Auth), não sincronização com outro estado local
    void recarregar();
  }, []);

  return (
    <div className="flex flex-col gap-6">
      {podeGerenciar && <ConvidarForm onConvidado={recarregar} />}

      {erro && (
        <p role="alert" className="rounded-lg bg-app-danger/10 px-3 py-2 text-sm text-app-danger">
          {erro}
        </p>
      )}

      <section>
        <h2 className="mb-3 text-sm font-medium text-app-muted">Membros</h2>
        {membros === null ? (
          <Loader2 size={16} className="animate-spin text-app-muted" />
        ) : (
          <ul className="flex flex-col gap-2">
            {membros.map((membro) => (
              <MembroRow
                key={membro.id}
                membro={membro}
                souEu={membro.userId === currentUserId}
                podeGerenciar={podeGerenciar}
                onMudou={recarregar}
              />
            ))}
          </ul>
        )}
      </section>

      {podeGerenciar && convites !== null && convites.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-medium text-app-muted">Convites pendentes</h2>
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

function ConvidarForm({ onConvidado }: { onConvidado: () => void }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Papel>("member");
  const [pending, setPending] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setLink(null);
    setPending(true);

    const result = await authClient.organization.inviteMember({ email, role });

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
    <form onSubmit={enviar} className="rounded-2xl border border-app-border bg-app-surface p-4">
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
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as Papel)}
            className="h-10 rounded-lg border border-app-border bg-app-surface px-3 text-sm text-app-text focus:border-app-primary focus:outline-none"
          >
            <option value="member">Membro</option>
            <option value="admin">Admin</option>
          </select>
        </Field>

        <Button type="submit" disabled={pending || !email.trim()}>
          {pending ? <Loader2 size={14} className="animate-spin" /> : "Convidar"}
        </Button>
      </div>

      {erro && <p className="mt-2 text-xs text-app-danger">{erro}</p>}

      {link && (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-app-surface-2 px-3 py-2 text-xs">
          <span className="min-w-0 flex-1 truncate text-app-muted">
            Ainda não enviamos e-mail automático — copie e mande este link pra pessoa: {link}
          </span>
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard.writeText(link);
              setCopiado(true);
              setTimeout(() => setCopiado(false), 2000);
            }}
            className="flex shrink-0 items-center gap-1 rounded-md border border-app-border px-2 py-1 hover:border-app-primary/60"
          >
            {copiado ? <Check size={12} /> : <Copy size={12} />}
            {copiado ? "Copiado" : "Copiar"}
          </button>
        </div>
      )}
    </form>
  );
}

function MembroRow({
  membro,
  souEu,
  podeGerenciar,
  onMudou,
}: {
  membro: Membro;
  souEu: boolean;
  podeGerenciar: boolean;
  onMudou: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function mudarPapel(novoPapel: string) {
    setPending(true);
    setErro(null);
    const result = await authClient.organization.updateMemberRole({ memberId: membro.id, role: novoPapel });
    setPending(false);
    if (result.error) setErro(traduzErroOrg(result.error.code));
    else onMudou();
  }

  async function remover() {
    setPending(true);
    setErro(null);
    const result = await authClient.organization.removeMember({ memberIdOrEmail: membro.userId });
    setPending(false);
    if (result.error) setErro(traduzErroOrg(result.error.code));
    else onMudou();
  }

  const podeMudarEsteMembro = podeGerenciar && membro.role !== "owner";

  return (
    <li
      className={cn(
        "flex items-center justify-between gap-3 rounded-lg border border-app-border bg-app-surface px-3 py-2.5",
        pending && "opacity-60",
      )}
    >
      <div className="min-w-0">
        <p className="truncate text-sm text-app-text">
          {membro.user.name} {souEu && <span className="text-app-muted">(você)</span>}
        </p>
        <p className="truncate text-xs text-app-muted">{membro.user.email}</p>
        {erro && <p className="mt-1 text-xs text-app-danger">{erro}</p>}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {podeMudarEsteMembro ? (
          <select
            value={membro.role}
            disabled={pending}
            onChange={(e) => void mudarPapel(e.target.value)}
            className="h-8 rounded-md border border-app-border bg-app-surface px-2 text-xs text-app-text focus:border-app-primary focus:outline-none"
          >
            <option value="member">Membro</option>
            <option value="admin">Admin</option>
          </select>
        ) : (
          <span className="text-xs text-app-muted">{RÓTULOS_DE_PAPEL[membro.role] ?? membro.role}</span>
        )}

        {podeGerenciar && !souEu && membro.role !== "owner" && (
          <button
            type="button"
            title="Remover da organização"
            disabled={pending}
            onClick={() => void remover()}
            className="grid h-8 w-8 place-items-center rounded-md text-app-muted hover:bg-app-danger/10 hover:text-app-danger"
          >
            <X size={14} />
          </button>
        )}
      </div>
    </li>
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
    <li className="flex items-center justify-between gap-3 rounded-lg border border-dashed border-app-border px-3 py-2.5">
      <div className="min-w-0">
        <p className="truncate text-sm text-app-text">{convite.email}</p>
        <p className="text-xs text-app-muted">{RÓTULOS_DE_PAPEL[convite.role ?? "member"] ?? convite.role}</p>
      </div>

      <button
        type="button"
        disabled={pending}
        onClick={() => void cancelar()}
        className="shrink-0 text-xs text-app-muted underline underline-offset-2 hover:text-app-text disabled:opacity-50"
      >
        Cancelar
      </button>
    </li>
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
