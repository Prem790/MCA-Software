import "server-only";
import { ConfigurationError } from "@/platform/configuration/env";
export function readStorageConfig(
  environment: Readonly<Record<string, string | undefined>> = process.env,
) {
  const provider = environment.DOCUMENT_STORAGE ?? "disabled";
  if (provider === "disabled") return { enabled: false as const };
  if (provider !== "vercel-blob")
    throw new ConfigurationError(["DOCUMENT_STORAGE"]);
  if (!environment.BLOB_READ_WRITE_TOKEN?.trim())
    throw new ConfigurationError(["BLOB_READ_WRITE_TOKEN"]);
  return { enabled: true as const, token: environment.BLOB_READ_WRITE_TOKEN };
}
