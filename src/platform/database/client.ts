import "server-only";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { readRuntimeConfig } from "@/platform/configuration/env";
import * as schema from "./schema";

function createDatabase() {
  const config = readRuntimeConfig();
  if (config.APP_MODE !== "application")
    throw new Error("Database is disabled in foundation mode");
  const pool = new Pool({
    connectionString: config.DATABASE_URL,
    max: 5,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 10000,
    statement_timeout: 5000,
  });
  pool.on("error", () =>
    console.error(
      JSON.stringify({
        level: "error",
        event: "database.pool_error",
        code: "DEPENDENCY_UNAVAILABLE",
      }),
    ),
  );
  return { pool, db: drizzle(pool, { schema }) };
}

// Explicit process-owned infrastructure lifecycle; no business state is cached here.
let connection: ReturnType<typeof createDatabase> | undefined;
export function getDatabase() {
  connection ??= createDatabase();
  return connection.db;
}
export async function closeDatabase() {
  const current = connection;
  connection = undefined;
  await current?.pool.end();
}
