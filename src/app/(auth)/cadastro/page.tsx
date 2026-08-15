import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getSession } from "@/server/auth/session";

import { AuthForm } from "../_components/auth-form";

export const metadata: Metadata = { title: "Criar conta" };

export default async function CadastroPage() {
  if (await getSession()) redirect("/funis");
  return <AuthForm mode="cadastro" />;
}
