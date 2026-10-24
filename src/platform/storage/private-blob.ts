import "server-only";
import { get, put, del } from "@vercel/blob";
import type { PrivateStorage } from "@/modules/documents/contracts";
import { ApplicationError } from "@/platform/http/errors";
import { readStorageConfig } from "./configuration";
export function privateBlobStorage(): PrivateStorage {
  const token = () => {
    const config = readStorageConfig();
    if (!config.enabled)
      throw new ApplicationError(
        "SERVICE_UNAVAILABLE",
        "Private document storage is not configured yet.",
      );
    return config.token;
  };
  return {
    async put(key, data, mediaType) {
      await put(key, Buffer.from(data), {
        access: "private",
        token: token(),
        addRandomSuffix: false,
        allowOverwrite: false,
        contentType: mediaType,
        abortSignal: AbortSignal.timeout(15000),
      });
    },
    async get(key) {
      const result = await get(key, {
        access: "private",
        token: token(),
        useCache: false,
        abortSignal: AbortSignal.timeout(15000),
      });
      return result?.statusCode === 200 ? result.stream : null;
    },
    async remove(key) {
      await del(key, {
        token: token(),
        abortSignal: AbortSignal.timeout(15000),
      });
    },
  };
}
