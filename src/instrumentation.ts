export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { readRuntimeConfig } = await import("@/platform/configuration/env");
    readRuntimeConfig();
  }
}
