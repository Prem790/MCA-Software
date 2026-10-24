export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { readRuntimeConfig } = await import("@/platform/configuration/env");
    readRuntimeConfig();
    const { readEmailConfig } = await import("@/platform/email/configuration");
    readEmailConfig();
    const { readStorageConfig } =
      await import("@/platform/storage/configuration");
    readStorageConfig();
  }
}
