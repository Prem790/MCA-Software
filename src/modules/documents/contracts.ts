import { z } from "zod";
export const MAX_DOCUMENT_BYTES = 3 * 1024 * 1024;
export const documentQuery = z.object({
  companyId: z.uuid(),
  taskId: z.uuid().optional(),
  page: z.coerce.number().int().min(1).max(10000).default(1),
});
export const uploadInput = z
  .object({
    companyId: z.uuid(),
    taskId: z.uuid().optional(),
    version: z.coerce.number().int().positive().optional(),
    name: z.string().min(1).max(200),
  })
  .strict()
  .refine(
    (value) => !value.taskId || value.version !== undefined,
    "Task version is required",
  );
export type UploadInput = z.infer<typeof uploadInput>;
export type DocumentSummary = {
  id: string;
  originalName: string;
  sizeBytes: number;
  mediaType: string;
  createdAt: Date;
  taskId: string | null;
};
export interface PrivateStorage {
  put(key: string, data: Uint8Array, mediaType: string): Promise<void>;
  get(key: string): Promise<ReadableStream<Uint8Array> | null>;
  remove(key: string): Promise<void>;
}
