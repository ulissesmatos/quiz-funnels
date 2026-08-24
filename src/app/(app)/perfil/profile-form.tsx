"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Avatar } from "@/components/ui/misc";
import { updateUser } from "@/lib/auth-client";

/**
 * Nome e foto. A foto é um link colado, não upload — o mesmo padrão que os
 * blocos de imagem do editor já usam; construir armazenamento de arquivo só
 * pra isto seria uma peça de infraestrutura nova, não reuso de nada existente.
 */
export function ProfileForm({ nomeInicial, imagemInicial }: { nomeInicial: string; imagemInicial: string | null }) {
  const router = useRouter();
  const [nome, setNome] = useState(nomeInicial);
  const [imagem, setImagem] = useState(imagemInicial ?? "");
  const [pending, setPending] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);

  async function salvar(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setSalvo(false);
    setPending(true);

    const result = await updateUser({ name: nome.trim(), image: imagem.trim() || null });

    setPending(false);
    if (result.error) {
      setErro("Não foi possível salvar. Tente novamente.");
      return;
    }

    setSalvo(true);
    // O nome/avatar aparecem em vários lugares renderizados no servidor
    // (sidebar, menu de conta) — sem isto eles ficariam desatualizados até a
    // próxima navegação.
    router.refresh();
  }

  return (
    <form onSubmit={salvar} className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <Avatar name={nome || "?"} image={imagem || null} size={56} className="shrink-0 text-lg" />
        <div className="min-w-0 flex-1">
          <Field label="URL da foto" hint="Cole o link de uma imagem. Em branco, mostra a inicial do nome.">
            <Input value={imagem} onChange={(e) => setImagem(e.target.value)} placeholder="https://…" />
          </Field>
        </div>
      </div>

      <Field label="Nome">
        <Input value={nome} onChange={(e) => setNome(e.target.value)} required />
      </Field>

      {erro && <p className="text-xs text-app-danger">{erro}</p>}

      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" loading={pending} disabled={!nome.trim()}>
          Salvar
        </Button>
        {salvo && !pending && <span className="text-xs text-app-success">Salvo.</span>}
      </div>
    </form>
  );
}
