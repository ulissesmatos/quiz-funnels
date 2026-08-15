"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { authClient } from "@/lib/auth-client";

type Mode = "entrar" | "cadastro";

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSignUp = mode === "cadastro";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "");
    const password = String(data.get("password") ?? "");
    const name = String(data.get("name") ?? "");

    const result = isSignUp
      ? await authClient.signUp.email({ email, password, name })
      : await authClient.signIn.email({ email, password });

    setPending(false);

    if (result.error) {
      setError(traduzErro(result.error.message ?? "", result.error.code));
      return;
    }

    router.push("/funis");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">{isSignUp ? "Criar conta" : "Entrar"}</h1>
        <p className="mt-1 text-sm text-app-muted">
          {isSignUp ? "Comece a montar seus funis em minutos." : "Bem-vindo de volta."}
        </p>
      </div>

      {isSignUp && (
        <Field label="Nome">
          <Input name="name" required autoComplete="name" placeholder="Como podemos te chamar?" />
        </Field>
      )}

      <Field label="E-mail">
        <Input name="email" type="email" required autoComplete="email" placeholder="voce@email.com" />
      </Field>

      <Field label="Senha" hint={isSignUp ? "Mínimo de 8 caracteres." : undefined}>
        <Input
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete={isSignUp ? "new-password" : "current-password"}
          placeholder="••••••••"
        />
      </Field>

      {error && (
        <p role="alert" className="rounded-lg bg-app-danger/10 px-3 py-2 text-sm text-app-danger">
          {error}
        </p>
      )}

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Aguarde..." : isSignUp ? "Criar conta" : "Entrar"}
      </Button>

      <p className="text-center text-sm text-app-muted">
        {isSignUp ? (
          <>
            Já tem conta?{" "}
            <Link href="/entrar" className="text-app-text underline underline-offset-4">
              Entrar
            </Link>
          </>
        ) : (
          <>
            Ainda não tem conta?{" "}
            <Link href="/cadastro" className="text-app-text underline underline-offset-4">
              Criar conta
            </Link>
          </>
        )}
      </p>
    </form>
  );
}

function traduzErro(message: string, code?: string): string {
  switch (code) {
    case "INVALID_EMAIL_OR_PASSWORD":
      return "E-mail ou senha incorretos.";
    case "USER_ALREADY_EXISTS":
      return "Já existe uma conta com este e-mail.";
    case "PASSWORD_TOO_SHORT":
      return "A senha precisa ter pelo menos 8 caracteres.";
    default:
      return message || "Não foi possível concluir. Tente novamente.";
  }
}
