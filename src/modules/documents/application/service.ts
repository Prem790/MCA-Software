import "server-only";
import { createHash, randomUUID } from "node:crypto";
import type { Actor } from "@/modules/firms";
import { ApplicationError } from "@/platform/http/errors";
import { logServiceFailure } from "@/platform/observability/logger";
import type { documentRepository } from "../infrastructure/repository";
import {
  documentQuery,
  uploadInput,
  MAX_DOCUMENT_BYTES,
  type PrivateStorage,
} from "../contracts";
import { documentMediaType, documentName } from "../domain/file-policy";
export function documentService(
  repository: ReturnType<typeof documentRepository>,
  storage: PrivateStorage,
) {
  return {
    list(actor: Actor, query: unknown) {
      const input = documentQuery.parse(query);
      return repository.list(actor, input.companyId, input.taskId, input.page);
    },
    async upload(
      actor: Actor,
      value: unknown,
      bytes: Uint8Array,
      requestId: string,
    ) {
      const input = uploadInput.parse(value);
      if (!bytes.length || bytes.length > MAX_DOCUMENT_BYTES)
        throw new ApplicationError(
          "VALIDATION_ERROR",
          "Choose a non-empty file no larger than 3 MB.",
        );
      const name = documentName(input.name);
      const mediaType = documentMediaType(name, bytes);
      if (!mediaType)
        throw new ApplicationError(
          "VALIDATION_ERROR",
          "Upload a PDF, PNG, JPEG or UTF-8 text file with a matching filename.",
        );
      const id = randomUUID();
      const key = `mca/${actor.firmId}/${input.companyId}/${id}`;
      const context = { ...actor, requestId };
      await repository.reserve(context, input, {
        id,
        key,
        name,
        mediaType,
        sizeBytes: bytes.length,
        sha256: createHash("sha256").update(bytes).digest("hex"),
      });
      try {
        await storage.put(key, bytes, mediaType);
        return await repository.finalize(context, input, id);
      } catch (error) {
        // Ambiguous storage/DB outcomes retain their reservation for operator reconciliation.
        try {
          if (await repository.fail(actor.firmId, id))
            await storage.remove(key);
        } catch {
          logServiceFailure("documents.cleanup_required", requestId);
        }
        throw error;
      }
    },
    async download(actor: Actor, id: string, requestId: string) {
      const row = await repository.download({ ...actor, requestId }, id);
      const stream = await storage.get(row.objectKey);
      if (!stream)
        throw new ApplicationError(
          "SERVICE_UNAVAILABLE",
          "The file is temporarily unavailable. Contact the administrator.",
        );
      return { stream, name: row.originalName, sizeBytes: row.sizeBytes };
    },
  };
}
