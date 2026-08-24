import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { env } from "@/lib/env";

import * as schema from "./schema";

/**
 * Em desenvolvimento o hot reload reavalia este módulo várias vezes; guardar a
 * conexão no globalThis evita abrir um pool novo a cada recarga.
 */
const globalForDb = globalThis as unknown as {
  __qfClient?: ReturnType<typeof postgres>;
};

const client =
  globalForDb.__qfClient ?? postgres(env().DATABASE_URL, { max: 10, prepare: false });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__qfClient = client;
}

export const db = drizzle(client, { schema });
export { schema };
export type Db = typeof db;
/** O `tx` recebido por `db.transaction(async (tx) => ...)` — sem `$client`, mas com a mesma query builder. */
export type DbOrTx = Db | Parameters<Parameters<Db["transaction"]>[0]>[0];
