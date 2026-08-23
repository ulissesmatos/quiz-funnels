import "server-only";

import { desc } from "drizzle-orm";

import { db } from "@/server/db";
import { errorLogs } from "@/server/db/schema";

export async function listRecentErrorLogs(limit = 50) {
  return db.select().from(errorLogs).orderBy(desc(errorLogs.createdAt)).limit(limit);
}
