import { test as base } from "@playwright/test";
import { Pool } from "pg";

export { expect, type Page } from "@playwright/test";

export const test = base.extend<{ resetAuthRateLimit: void }>({
  resetAuthRateLimit: [
    async ({ baseURL }, use, testInfo) => {
      const url = new URL(
        process.env.WORKSPACE_TEST_DATABASE_URL ??
          "postgresql://missing/invalid",
      );
      const app = new URL(baseURL ?? "https://missing.invalid");
      if (
        !["127.0.0.1", "localhost"].includes(url.hostname) ||
        !url.pathname.startsWith("/mca_workspace_e2e") ||
        !["127.0.0.1", "localhost"].includes(app.hostname) ||
        app.port !== "3200" ||
        testInfo.config.workers !== 1
      ) {
        throw new Error(
          "Workspace browser tests require one worker, the local test server and a dedicated local mca_workspace_e2e database.",
        );
      }
      const pool = new Pool({
        connectionString: url.toString(),
        max: 1,
        connectionTimeoutMillis: 5000,
      });
      try {
        // Each scenario starts with an independent client budget. Leave accounts,
        // sessions and business records intact; limits stay active within a test.
        await pool.query("DELETE FROM auth_rate_limit");
      } finally {
        await pool.end();
      }
      await use();
    },
    { auto: true },
  ],
});
