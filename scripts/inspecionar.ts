/** Inspeção pontual de um funil do banco. Uso: pnpm exec tsx --env-file=.env scripts/inspecionar.ts <id> */
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { lintFunnel } from "@/funnel/logic/lint";
import { parseFunnelDocument } from "@/funnel/schema";
import { walkBlocks } from "@/funnel/schema/block";

import * as schema from "../src/server/db/schema";

async function main() {
  const id = process.argv[2];
  const client = postgres(process.env.DATABASE_URL!, { max: 1 });
  const db = drizzle(client, { schema });

  try {
    const [funil] = await db.select().from(schema.funnels).where(eq(schema.funnels.id, id)).limit(1);
    if (!funil) return console.log("funil não encontrado");

    console.log(`# ${funil.name} (${funil.slug}) · status ${funil.status}`);

    const parsed = parseFunnelDocument(funil.document);
    if (!parsed.success) {
      console.log("\n!! DOCUMENTO INVÁLIDO");
      for (const issue of parsed.error.issues.slice(0, 15)) {
        console.log(`  ${issue.path.join(".")}: ${issue.message}`);
      }
      return;
    }

    const doc = parsed.data;
    console.log(`${doc.steps.length} telas\n`);

    for (const [i, step] of doc.steps.entries()) {
      const tipos = step.blocks.map((b) => b.type).join(", ");
      console.log(`${i + 1}. ${step.id} [${step.type}] ${step.name}`);
      console.log(`     blocos: ${tipos}`);

      for (const rule of step.logic.rules) {
        console.log(`     → ${rule.id}: ${JSON.stringify(rule.when)} ⇒ ${rule.goto}`);
      }
      if (step.logic.next) console.log(`     → next fixo: ${step.logic.next}`);
      if (step.logic.isEnd) console.log(`     → fim`);

      for (const block of walkBlocks(step.blocks)) {
        if (block.visibleIf) {
          console.log(`     ◇ ${block.id} condicional: ${JSON.stringify(block.visibleIf)}`);
        }
        if (block.type === "choice") {
          const comScore = block.props.options.filter((o) => o.score || o.scores).length;
          console.log(
            `     ? ${block.props.name}: ${block.props.options.length} opções, ${comScore} com pontuação`,
          );
        }
        if (block.type === "result") {
          const comCondicao = block.props.outcomes.filter((o) => o.when).length;
          console.log(
            `     ★ resultado: ${block.props.outcomes.length} outcomes, ${comCondicao} com condição`,
          );
        }
        if (block.type === "button") {
          console.log(`     ▸ botão "${block.props.label}" → ${JSON.stringify(block.props.action)}`);
        }
      }
      console.log("");
    }

    console.log("## Lint");
    const issues = lintFunnel(doc);
    if (issues.length === 0) console.log("  nenhum problema");
    for (const issue of issues) {
      console.log(`  [${issue.severity}] ${issue.code}: ${issue.message}`);
    }
  } finally {
    await client.end();
  }
}

void main();
