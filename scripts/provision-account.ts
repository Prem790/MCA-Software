import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "../src/platform/database/schema";
import { provisionAccount } from "../src/modules/identity/infrastructure/provision";

if (
  process.env.ALLOW_ACCOUNT_PROVISIONING !== "true" ||
  !process.env.DATABASE_URL
) {
  throw new Error(
    "Account provisioning refused: explicitly set ALLOW_ACCOUNT_PROVISIONING=true and a development DATABASE_URL.",
  );
}
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 1,
  connectionTimeoutMillis: 5000,
  statement_timeout: 10000,
});
try {
  const result = await provisionAccount(drizzle(pool, { schema }), {
    name: process.env.PROVISION_NAME,
    email: process.env.PROVISION_EMAIL,
    password: process.env.PROVISION_PASSWORD,
    firmName: process.env.PROVISION_FIRM_NAME || undefined,
    firmId: process.env.PROVISION_FIRM_ID || undefined,
    role: process.env.PROVISION_ROLE || "admin",
  });
  console.info(
    `Account provisioned. Firm ID: ${result.firmId}. No password was logged.`,
  );
} catch {
  console.error(
    "Provisioning failed. Check required fields, unique email and target firm privately. No credential values were logged.",
  );
  process.exitCode = 1;
} finally {
  await pool.end();
}
