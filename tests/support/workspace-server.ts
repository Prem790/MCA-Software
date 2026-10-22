import { cp, mkdtemp, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import * as schema from "@/platform/database/schema";
import { provisionAccount } from "@/modules/identity/infrastructure/provision";

// Opt-in dedicated local database, never a developer's configured Neon database.
const url = new URL(
  process.env.WORKSPACE_TEST_DATABASE_URL ?? "postgresql://missing/invalid",
);
if (
  !["127.0.0.1", "localhost"].includes(url.hostname) ||
  !url.pathname.startsWith("/mca_workspace_e2e")
) {
  throw new Error(
    "Set WORKSPACE_TEST_DATABASE_URL to a fresh local mca_workspace_e2e database.",
  );
}
const pool = new Pool({
  connectionString: url.toString(),
  max: 1,
  connectionTimeoutMillis: 5000,
});
try {
  const db = drizzle(pool, { schema });
  await migrate(db, { migrationsFolder: "./drizzle" });
  const admin = await provisionAccount(db, {
    name: "Test Administrator",
    email: "admin@example.test",
    password: "test-only-password-12345",
    firmName: "Workspace Browser Test Firm",
  });
  await provisionAccount(db, {
    name: "Test Staff",
    email: "staff@example.test",
    password: "test-only-password-12345",
    firmId: admin.firmId,
    role: "staff",
  });
} catch {
  console.error(
    "Workspace test setup failed. Use a fresh dedicated local test database. No credentials were logged.",
  );
  process.exitCode = 1;
} finally {
  await pool.end();
}
if (!process.exitCode) {
  // A developer may already have Next running. Never share its .next locks or
  // let test type generation rewrite files in the working checkout.
  const isolated = await mkdtemp(join(tmpdir(), "mca-workspace-browser-"));
  for (const name of [
    "src",
    "public",
    "scripts",
    "package.json",
    "package-lock.json",
    "next.config.ts",
    "postcss.config.mjs",
    "tsconfig.json",
    "next-env.d.ts",
  ]) {
    await cp(name, join(isolated, name), { recursive: true });
  }
  await symlink(
    join(process.cwd(), "node_modules"),
    join(isolated, "node_modules"),
    "dir",
  );
  const child = spawn(
    process.execPath,
    [
      "node_modules/next/dist/bin/next",
      "dev",
      "--webpack",
      "--hostname",
      "127.0.0.1",
      "--port",
      "3200",
    ],
    {
      cwd: isolated,
      stdio: "inherit",
      env: {
        ...process.env,
        NODE_ENV: "development",
        APP_MODE: "application",
        APP_URL: "http://127.0.0.1:3200",
        DATABASE_URL: url.toString(),
        BETTER_AUTH_SECRET: randomBytes(48).toString("base64url"),
        NEXT_TELEMETRY_DISABLED: "1",
      },
    },
  );
  for (const signal of ["SIGINT", "SIGTERM"] as const)
    process.on(signal, () => child.kill(signal));
  child.on("exit", (code) => {
    void rm(isolated, { recursive: true, force: true }).then(() => {
      process.exitCode = code ?? 0;
    });
  });
}
