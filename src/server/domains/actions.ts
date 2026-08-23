"use server";

import { randomBytes } from "node:crypto";
import { resolveTxt } from "node:dns/promises";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireOrganization } from "@/server/auth/session";
import { db } from "@/server/db";
import { funnelDomains } from "@/server/db/schema";
import { getFunnelForOrganization } from "@/server/funnels/queries";
import type { ActionResult } from "@/server/shared/action-result";

/** Um hostname de verdade — não aceita esquema, caminho ou porta. */
const HostnameSchema = z
  .string()
  .toLowerCase()
  .regex(
    /^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/,
    "Informe um domínio válido, sem https:// nem barra — ex.: quiz.suamarca.com.br",
  );

export type AddDomainResult =
  | { ok: true; domain: { id: string; hostname: string; verificationToken: string; createdAt: Date } }
  | { ok: false; error: string };

export async function addFunnelDomainAction(funnelId: string, hostnameRaw: string): Promise<AddDomainResult> {
  const { organization } = await requireOrganization();

  const funnel = await getFunnelForOrganization(funnelId, organization.id);
  if (!funnel) return { ok: false, error: "Funil não encontrado." };

  const parsed = HostnameSchema.safeParse(hostnameRaw.trim());
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const verificationToken = randomBytes(16).toString("hex");

  let created: { id: string; hostname: string; verificationToken: string; createdAt: Date };
  try {
    [created] = await db
      .insert(funnelDomains)
      .values({ funnelId, hostname: parsed.data, verificationToken })
      .returning({
        id: funnelDomains.id,
        hostname: funnelDomains.hostname,
        verificationToken: funnelDomains.verificationToken,
        createdAt: funnelDomains.createdAt,
      });
  } catch {
    // Violação do unique(hostname) — mensagem específica vale mais que o erro cru do Postgres.
    return { ok: false, error: "Este domínio já está em uso." };
  }

  revalidatePath(`/funis/${funnelId}/analytics`);
  return { ok: true, domain: created };
}

/**
 * Confere se o registro TXT `_funis-challenge.{hostname}` contém o token
 * gerado na criação — é o que prova que quem está configurando o domínio
 * também controla o DNS dele, antes de o proxy passar a servir esse
 * hostname.
 */
export async function verifyFunnelDomainAction(domainId: string, funnelId: string): Promise<ActionResult> {
  const { organization } = await requireOrganization();

  const funnel = await getFunnelForOrganization(funnelId, organization.id);
  if (!funnel) return { ok: false, error: "Funil não encontrado." };

  const [domain] = await db
    .select({ hostname: funnelDomains.hostname, verificationToken: funnelDomains.verificationToken })
    .from(funnelDomains)
    .where(and(eq(funnelDomains.id, domainId), eq(funnelDomains.funnelId, funnelId)))
    .limit(1);
  if (!domain) return { ok: false, error: "Domínio não encontrado." };

  const confirmado = await procurarTokenNoTxt(domain.hostname, domain.verificationToken);
  if (!confirmado) {
    return {
      ok: false,
      error: "Registro TXT não encontrado ainda — a propagação de DNS pode levar algumas horas.",
    };
  }

  await db.update(funnelDomains).set({ verifiedAt: new Date() }).where(eq(funnelDomains.id, domainId));

  revalidatePath(`/funis/${funnelId}/analytics`);
  return { ok: true };
}

async function procurarTokenNoTxt(hostname: string, token: string): Promise<boolean> {
  try {
    const registros = await resolveTxt(`_funis-challenge.${hostname}`);
    return registros.some((partes) => partes.join("").includes(token));
  } catch {
    // Sem registro, domínio inexistente, timeout de DNS — tudo vira "ainda não verificado".
    return false;
  }
}

export async function removeFunnelDomainAction(domainId: string, funnelId: string): Promise<ActionResult> {
  const { organization } = await requireOrganization();

  const funnel = await getFunnelForOrganization(funnelId, organization.id);
  if (!funnel) return { ok: false, error: "Funil não encontrado." };

  await db.delete(funnelDomains).where(and(eq(funnelDomains.id, domainId), eq(funnelDomains.funnelId, funnelId)));

  revalidatePath(`/funis/${funnelId}/analytics`);
  return { ok: true };
}
