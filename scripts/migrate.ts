import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

const url = process.env.DATABASE_MIGRATION_URL || process.env.DATABASE_URL;
if (!url)
  throw new Error(
    "Set DATABASE_MIGRATION_URL or DATABASE_URL before migrating",
  );
const pool = new Pool({
  connectionString: url,
  max: 1,
  connectionTimeoutMillis: 5000,
  statement_timeout: 30000,
});
try {
  await migrate(drizzle(pool), { migrationsFolder: "./drizzle" });
  console.info("Database migrations applied.");
} catch {
  console.error(
    "Migration failed. No connection string was logged. Inspect the target database and migration history before retrying.",
  );
  process.exitCode = 1;
} finally {
  await pool.end();
}
