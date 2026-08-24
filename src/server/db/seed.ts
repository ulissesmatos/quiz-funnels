/**
 * Popula o banco local com um usuário demo, uma organização e o funil de
 * exemplo já publicado.
 *
 * Abre a própria conexão em vez de importar `@/server/db`: aquele módulo puxa
 * `server-only`, que é feito para explodir fora do runtime do Next.
 *
 * Rodar com: pnpm db:seed
 */
import { eq, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { nanoid } from "nanoid";
import postgres from "postgres";

import { metabolismoTemplate } from "@/funnel/templates/metabolismo";
import { vitrineTemplate } from "@/funnel/templates/vitrine";
import { parseFunnelDocument, type FunnelDocument } from "@/funnel/schema";

import * as schema from "./schema";

const DEMO_EMAIL = "demo@local.dev";
const DEMO_SENHA = "demo12345";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL não definida. Copie .env.example para .env.");

  const client = postgres(url, { max: 1 });
  const db = drizzle(client, { schema });

  try {
    // Falhar aqui é melhor do que gravar um documento quebrado e só descobrir
    // quando a página pública der 404.
    const modelos = [metabolismoTemplate, vitrineTemplate];
    const validados: FunnelDocument[] = [];

    for (const modelo of modelos) {
      const parsed = parseFunnelDocument(modelo);
      if (!parsed.success) {
        console.error(`O funil "${modelo.name}" não passou na validação do schema:`);
        for (const issue of parsed.error.issues) {
          console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
        }
        process.exitCode = 1;
        return;
      }
      validados.push(parsed.data);
    }

    const now = new Date();

    let [demoUser] = await db
      .select()
      .from(schema.user)
      .where(eq(schema.user.email, DEMO_EMAIL))
      .limit(1);

    if (!demoUser) {
      const userId = nanoid();
      [demoUser] = await db
        .insert(schema.user)
        .values({
          id: userId,
          name: "Conta demo",
          email: DEMO_EMAIL,
          emailVerified: true,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      // O Better Auth guarda a senha em `account` com providerId "credential".
      // O hash é o do scrypt que ele usa por padrão.
      await db.insert(schema.account).values({
        id: nanoid(),
        accountId: userId,
        providerId: "credential",
        userId,
        password: await hashPassword(DEMO_SENHA),
        createdAt: now,
        updatedAt: now,
      });

      console.log(`✓ usuário demo criado: ${DEMO_EMAIL} / ${DEMO_SENHA}`);
    } else {
      console.log(`· usuário demo já existia: ${DEMO_EMAIL}`);
    }

    let [org] = await db
      .select()
      .from(schema.organization)
      .where(eq(schema.organization.slug, "demo"))
      .limit(1);

    if (!org) {
      const orgId = nanoid();
      [org] = await db
        .insert(schema.organization)
        .values({ id: orgId, name: "Organização demo", slug: "demo", createdAt: now })
        .returning();

      await db.insert(schema.member).values({
        id: nanoid(),
        organizationId: orgId,
        userId: demoUser.id,
        role: "owner",
        createdAt: now,
      });

      console.log("✓ organização demo criada");
    } else {
      console.log("· organização demo já existia");
    }

    // Planos iniciais — números de partida, editáveis em /admin/planos a
    // partir do primeiro minuto. "Starter" mantém o preço que a plataforma já
    // cobrava antes de existir mais de um plano, pra ninguém ser surpreendido.
    const PLANOS_SEED = [
      {
        slug: "starter",
        name: "Starter",
        description: "Para quem está começando a testar funis de quiz.",
        monthlyPriceCents: 9700,
        trialDays: 7,
        maxFunnels: 5,
        maxLeadsPerFunnel: 500,
        canUseTeam: false,
        canUseWebhooks: false,
        featured: false,
        sortOrder: 0,
      },
      {
        slug: "pro",
        name: "Pro",
        description: "Para quem já vive de funil e precisa de equipe e automações.",
        monthlyPriceCents: 19700,
        trialDays: 7,
        maxFunnels: 20,
        maxLeadsPerFunnel: 5000,
        canUseTeam: true,
        canUseWebhooks: true,
        featured: true,
        sortOrder: 1,
      },
      {
        slug: "business",
        name: "Business",
        description: "Sem limite de funil nem de lead, para operações grandes.",
        monthlyPriceCents: 39700,
        trialDays: 14,
        maxFunnels: null,
        maxLeadsPerFunnel: null,
        canUseTeam: true,
        canUseWebhooks: true,
        featured: false,
        sortOrder: 2,
      },
    ] as const;

    let starterId: string | null = null;

    for (const planoSeed of PLANOS_SEED) {
      const [existente] = await db
        .select({ id: schema.plans.id })
        .from(schema.plans)
        .where(eq(schema.plans.slug, planoSeed.slug))
        .limit(1);

      const id =
        existente?.id ??
        (await db.insert(schema.plans).values(planoSeed).returning({ id: schema.plans.id }))[0].id;

      if (!existente) console.log(`✓ plano "${planoSeed.name}" criado`);
      if (planoSeed.slug === "starter") starterId = id;
    }

    // Backfill: qualquer assinatura ainda sem plano (todas, hoje — a coluna é
    // nova) recebe o Starter, que é o único preço que já existia antes desta
    // feature.
    if (starterId) {
      const atualizadas = await db
        .update(schema.organizationSubscriptions)
        .set({ planId: starterId, updatedAt: now })
        .where(isNull(schema.organizationSubscriptions.planId))
        .returning({ id: schema.organizationSubscriptions.id });

      if (atualizadas.length > 0) {
        console.log(`✓ ${atualizadas.length} assinatura(s) associada(s) ao plano Starter`);
      }
    }

    for (const document of validados) {
      const [existingFunnel] = await db
        .select()
        .from(schema.funnels)
        .where(eq(schema.funnels.slug, document.slug))
        .limit(1);

      const funnelId =
        existingFunnel?.id ??
        (
          await db
            .insert(schema.funnels)
            .values({
              organizationId: org.id,
              slug: document.slug,
              name: document.name,
              document,
              createdBy: demoUser.id,
            })
            .returning({ id: schema.funnels.id })
        )[0].id;

      if (existingFunnel) {
        await db
          .update(schema.funnels)
          .set({ document, name: document.name, updatedAt: now })
          .where(eq(schema.funnels.id, funnelId));
      }

      // Republica sempre, para o seed refletir edições feitas no template.
      const versions = await db
        .select({ version: schema.funnelVersions.version })
        .from(schema.funnelVersions)
        .where(eq(schema.funnelVersions.funnelId, funnelId));

      const nextVersion = versions.reduce((max, v) => Math.max(max, v.version), 0) + 1;

      const [version] = await db
        .insert(schema.funnelVersions)
        .values({ funnelId, version: nextVersion, document, publishedBy: demoUser.id })
        .returning({ id: schema.funnelVersions.id });

      await db
        .update(schema.funnels)
        .set({ publishedVersionId: version.id, status: "published", updatedAt: now })
        .where(eq(schema.funnels.id, funnelId));

      console.log(`✓ funil "${document.name}" publicado (v${nextVersion})`);
      console.log(`    http://localhost:3000/f/${document.slug}`);
    }

    console.log("");
  } finally {
    await client.end();
  }
}

/**
 * Reimplementa o hash de senha padrão do Better Auth (scrypt), para a conta
 * demo conseguir logar pela tela normal.
 */
async function hashPassword(password: string): Promise<string> {
  const { scrypt, randomBytes } = await import("node:crypto");
  const salt = randomBytes(16).toString("hex");

  const key = await new Promise<Buffer>((resolve, reject) => {
    scrypt(password.normalize("NFKC"), salt, 64, { N: 16384, r: 16, p: 1, maxmem: 128 * 16384 * 16 * 2 }, (err, derived) =>
      err ? reject(err) : resolve(derived),
    );
  });

  return `${salt}:${key.toString("hex")}`;
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
