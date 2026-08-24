"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { organization } from "@/lib/auth-client";

/**
 * Nome e identificador da organização. Só quem é dono ou admin vê o formulário
 * — os demais veem os valores atuais sem campo nenhum, porque a API do
 * Better Auth recusaria a troca de qualquer forma.
 */
export function OrganizacaoForm({
  organizationId,
  nomeInicial,
  slugInicial,
  podeEditar,
}: {
  organizationId: string;
  nomeInicial: string;
  slugInicial: string;
  podeEditar: boolean;
}) {
  const router = useRouter();
  const [nome, setNome] = useState(nomeInicial);
  const [slug, setSlug] = useState(slugInicial);
  const [pending, setPending] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);

  if (!podeEditar) {
    return (
      <dl className="flex flex-col gap-1.5 text-sm">
        <div className="flex gap-1.5">
          <dt className="text-app-muted">Nome:</dt>
          <dd className="text-app-text">{nomeInicial}</dd>
        </div>
        <div className="flex gap-1.5">
          <dt className="text-app-muted">Identificador:</dt>
          <dd className="text-app-text">{slugInicial}</dd>
        </div>
        <p className="mt-1.5 text-xs text-app-muted">Só quem é dono ou admin pode alterar estes dados.</p>
      </dl>
    );
  }

  async function salvar(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setSalvo(false);
    setPending(true);

    const result = await organization.update({
      data: { name: nome.trim(), slug: slug.trim() },
      organizationId,
    });

    setPending(false);
    if (result.error) {
      setErro(traduzErro(result.error.code));
      return;
    }

    setSalvo(true);
    router.refresh();
  }

  return (
    <form onSubmit={salvar} className="flex flex-col gap-4">
      <Field label="Nome da organização">
        <Input value={nome} onChange={(e) => setNome(e.target.value)} required />
      </Field>

      <Field label="Identificador" hint="Só letras minúsculas, números e hífen — usado internamente para diferenciar organizações.">
        <Input
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          required
          pattern="[a-z0-9-]+"
        />
      </Field>

      {erro && <p className="text-xs text-app-danger">{erro}</p>}

      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" loading={pending} disabled={!nome.trim() || !slug.trim()}>
          Salvar
        </Button>
        {salvo && !pending && <span className="text-xs text-app-success">Salvo.</span>}
      </div>
    </form>
  );
}

function traduzErro(code?: string): string {
  switch (code) {
    case "ORGANIZATION_SLUG_ALREADY_TAKEN":
    case "ORGANIZATION_ALREADY_EXISTS":
      return "Este identificador já está em uso por outra organização.";
    default:
      return "Não foi possível salvar. Tente novamente.";
  }
}
