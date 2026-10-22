import { fileURLToPath } from "node:url";
import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  timeout: 90000,
  outputDir: "../test-results/workspace",
  testDir: "../tests/workspace-e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3200",
    trace: "retain-on-failure",
    ...devices["Desktop Chrome"],
  },
  webServer: {
    cwd: fileURLToPath(new URL("..", import.meta.url)),
    command:
      "node --conditions=react-server --import tsx tests/support/workspace-server.ts",
    url: "http://127.0.0.1:3200/api/health",
    timeout: 120000,
    reuseExistingServer: false,
  },
});
