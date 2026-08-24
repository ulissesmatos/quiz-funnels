"use client";

import { useState, type FormEvent } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { changePassword } from "@/lib/auth-client";

export function PasswordForm() {
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [sairDosOutros, setSairDosOutros] = useState(false);
  const [pending, setPending] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);

  async function salvar(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setSalvo(false);

    if (novaSenha !== confirmacao) {
      setErro("A confirmação não bate com a nova senha.");
      return;
    }

    setPending(true);
    const result = await changePassword({
      currentPassword: senhaAtual,
      newPassword: novaSenha,
      revokeOtherSessions: sairDosOutros,
    });
    setPending(false);

    if (result.error) {
      setErro(traduzErro(result.error.code));
      return;
    }

    setSenhaAtual("");
    setNovaSenha("");
    setConfirmacao("");
    setSalvo(true);
  }

  return (
    <form onSubmit={salvar} className="flex flex-col gap-4">
      <Field label="Senha atual">
        <Input
          type="password"
          value={senhaAtual}
          onChange={(e) => setSenhaAtual(e.target.value)}
          required
          autoComplete="current-password"
        />
      </Field>

      <Field label="Nova senha" hint="Pelo menos 8 caracteres.">
        <Input
          type="password"
          value={novaSenha}
          onChange={(e) => setNovaSenha(e.target.value)}
          required
          minLength={8}
          autoComplete="new-password"
        />
      </Field>

      <Field label="Confirmar nova senha">
        <Input
          type="password"
          value={confirmacao}
          onChange={(e) => setConfirmacao(e.target.value)}
          required
          autoComplete="new-password"
        />
      </Field>

      <label className="flex items-center gap-2.5 text-sm text-app-text">
        <input
          type="checkbox"
          className="h-4 w-4 accent-[var(--color-app-primary)]"
          checked={sairDosOutros}
          onChange={(e) => setSairDosOutros(e.target.checked)}
        />
        Sair de todos os outros dispositivos
      </label>

      {erro && <Alert tone="danger">{erro}</Alert>}
      {salvo && !erro && <Alert tone="success">Senha alterada.</Alert>}

      <div>
        <Button type="submit" size="sm" loading={pending} disabled={!senhaAtual || novaSenha.length < 8}>
          Alterar senha
        </Button>
      </div>
    </form>
  );
}

function traduzErro(code?: string): string {
  switch (code) {
    case "INVALID_PASSWORD":
      return "Senha atual incorreta.";
    case "PASSWORD_TOO_SHORT":
      return "A nova senha precisa ter pelo menos 8 caracteres.";
    case "PASSWORD_TOO_LONG":
      return "A nova senha é longa demais.";
    case "CREDENTIAL_ACCOUNT_NOT_FOUND":
      return "Esta conta não usa senha (entrou por outro método).";
    default:
      return "Não foi possível alterar a senha. Tente novamente.";
  }
}
