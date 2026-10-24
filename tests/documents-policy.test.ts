import { expect, it } from "vitest";
import {
  documentName,
  documentMediaType,
} from "@/modules/documents/domain/file-policy";
import { documentBody, attachmentHeader } from "@/platform/http/documents";
import { MAX_DOCUMENT_BYTES } from "@/modules/documents/contracts";
import { readStorageConfig } from "@/platform/storage/configuration";
it("rejects disguised file types, binaries and invalid text", () => {
  expect(
    documentMediaType("proof.pdf", new TextEncoder().encode("%PDF-1.7")),
  ).toBe("application/pdf");
  expect(
    documentMediaType("proof.pdf", new TextEncoder().encode("<html>")),
  ).toBeNull();
  expect(
    documentMediaType("proof.exe", new TextEncoder().encode("%PDF-1.7")),
  ).toBeNull();
  expect(documentMediaType("proof.txt", new Uint8Array([255, 0]))).toBeNull();
  expect(
    documentMediaType("notes.txt", new TextEncoder().encode("Meeting notes\n")),
  ).toBe("text/plain");
});
it("neutralizes path/header characters and encodes download names", () => {
  expect(documentName("../evil\r\nname.pdf")).toBe(".._evil__name.pdf");
  const header = attachmentHeader('a"\r\nfile.pdf');
  expect(header).not.toContain("\r");
  expect(header).toContain("%0D%0A");
});
it("bounds chunked upload bodies even without content-length", async () => {
  const body = new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array(MAX_DOCUMENT_BYTES));
      controller.enqueue(new Uint8Array(1));
      controller.close();
    },
  });
  const request = new Request("http://localhost/upload", {
    method: "POST",
    headers: { "content-type": "application/octet-stream" },
    body,
    duplex: "half",
  } as RequestInit);
  await expect(documentBody(request)).rejects.toMatchObject({
    code: "VALIDATION_ERROR",
  });
});
it("keeps storage disabled by default and rejects incomplete configuration", () => {
  expect(readStorageConfig({})).toEqual({ enabled: false });
  expect(() => readStorageConfig({ DOCUMENT_STORAGE: "public" })).toThrow(
    "DOCUMENT_STORAGE",
  );
  expect(() => readStorageConfig({ DOCUMENT_STORAGE: "vercel-blob" })).toThrow(
    "BLOB_READ_WRITE_TOKEN",
  );
});
