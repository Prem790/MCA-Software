import "server-only";
import { MAX_DOCUMENT_BYTES } from "@/modules/documents/contracts";
import { ApplicationError } from "./errors";
export async function documentBody(request: Request) {
  if (
    !request.headers.get("content-type")?.startsWith("application/octet-stream")
  )
    throw new ApplicationError(
      "VALIDATION_ERROR",
      "Send the file as application/octet-stream.",
    );
  const length = Number(request.headers.get("content-length"));
  if (length > MAX_DOCUMENT_BYTES)
    throw new ApplicationError(
      "VALIDATION_ERROR",
      "Files may not exceed 3 MB.",
    );
  const reader = request.body?.getReader();
  if (!reader) throw new ApplicationError("VALIDATION_ERROR", "Choose a file.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_DOCUMENT_BYTES) {
        await reader.cancel();
        throw new ApplicationError(
          "VALIDATION_ERROR",
          "Files may not exceed 3 MB.",
        );
      }
      chunks.push(value);
    }
    return Buffer.concat(chunks);
  } finally {
    reader.releaseLock();
  }
}
export function attachmentHeader(name: string) {
  const encoded = encodeURIComponent(name).replace(
    /[!'()*]/g,
    (value) => `%${value.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  return `attachment; filename="document"; filename*=UTF-8''${encoded}`;
}
