/**
 * Popula o banco local com um usuário demo, uma organização e o funil de
 * exemplo já publicado.
 *
 * Abre a própria conexão em vez de importar `@/server/db`: aquele módulo puxa
 * `server-only`, que é feito para explodir fora do runtime do Next.
 *
 * Rodar com: pnpm db:seed
 */
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { nanoid } from "nanoid";
import postgres from "postgres";

import { metabolismoTemplate } from "@/funnel/templates/metabolismo";
import { parseFunnelDocument } from "@/funnel/schema";

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
    const parsed = parseFunnelDocument(metabolismoTemplate);
    if (!parsed.success) {
      console.error("O funil de exemplo não passou na validação do schema:");
      for (const issue of parsed.error.issues) {
        console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
      }
      process.exitCode = 1;
      return;
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

    const document = parsed.data;

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
    console.log(`\n  Acesse: http://localhost:3000/f/${document.slug}\n`);
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
