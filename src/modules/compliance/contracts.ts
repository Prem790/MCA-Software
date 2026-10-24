import { z } from "zod";
import { isDateOnly } from "@/lib/work-dates";
import { recurrenceOptions, type Recurrence } from "./domain/recurrence";
import type { Actor } from "@/modules/firms";

export const deadline = z
  .string()
  .refine(isDateOnly, "Enter a real calendar date between 2000 and 2199");
export const templateInput = z
  .object({
    name: z.string().trim().min(2).max(200),
    description: z.string().trim().max(4000),
  })
  .strict();
export const templateUpdate = templateInput.extend({
  version: z.number().int().positive(),
});
export const obligationInput = z
  .object({
    companyId: z.uuid(),
    templateId: z.uuid().nullable().default(null),
    title: z.string().trim().min(2).max(200),
    description: z.string().trim().max(4000),
    reportingPeriod: z.string().trim().min(1).max(100),
    dueDate: deadline,
    confirmed: z.literal(true),
    recurrence: z.enum(recurrenceOptions).default("none"),
  })
  .strict();
export const obligationUpdate = obligationInput
  .omit({ companyId: true, templateId: true, recurrence: true })
  .extend({ version: z.number().int().positive() });
export const nextOccurrenceInput = z
  .object({
    dueDate: deadline,
    reportingPeriod: z.string().trim().min(1).max(100),
    confirmed: z.literal(true),
  })
  .strict();
export const obligationQuery = z.object({
  companyId: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.uuid().optional(),
  ),
  q: z.string().trim().max(200).default(""),
  due: z.enum(["all", "overdue", "upcoming"]).default("all"),
  archived: z.enum(["active", "all"]).default("active"),
  page: z.coerce.number().int().min(1).max(10000).default(1),
});
export type WorkContext = Actor & { requestId: string };
export type TemplateInput = z.infer<typeof templateInput>;
export type ObligationInput = z.infer<typeof obligationInput>;
export type ObligationUpdate = z.infer<typeof obligationUpdate>;
export type ObligationQuery = z.infer<typeof obligationQuery>;
export type NextOccurrenceInput = z.infer<typeof nextOccurrenceInput>;
export type TemplateRecord = TemplateInput & {
  id: string;
  version: number;
  archivedAt: Date | null;
};
export type ObligationRecord = {
  id: string;
  firmId: string;
  companyId: string;
  templateId: string | null;
  title: string;
  description: string;
  reportingPeriod: string;
  dueDate: string;
  dueDateConfirmedAt: Date | null;
  recurrence: Recurrence;
  seriesId: string | null;
  anchorDueDate: string | null;
  occurrenceNumber: number;
  version: number;
  createdAt: Date;
};
export type ObligationDetail = ObligationRecord & {
  companyName: string;
  companyArchivedAt: Date | null;
};
export interface ComplianceRepository {
  templates(
    firmId: string,
    page: number,
  ): Promise<{ items: TemplateRecord[]; total: number }>;
  template(firmId: string, id: string): Promise<TemplateRecord>;
  saveTemplate(
    context: WorkContext,
    input: TemplateInput & { version?: number },
    id?: string,
  ): Promise<TemplateRecord>;
  archiveTemplate(context: WorkContext, id: string): Promise<void>;
  list(
    firmId: string,
    query: ObligationQuery,
    today: string,
  ): Promise<{ items: ObligationDetail[]; total: number }>;
  detail(firmId: string, id: string): Promise<ObligationDetail>;
  create(
    context: WorkContext,
    input: ObligationInput,
  ): Promise<ObligationRecord>;
  update(
    context: WorkContext,
    id: string,
    input: ObligationUpdate,
  ): Promise<ObligationRecord>;
  next(
    context: WorkContext,
    id: string,
    input: NextOccurrenceInput,
  ): Promise<{ obligation: ObligationRecord; alreadyExists: boolean }>;
}
