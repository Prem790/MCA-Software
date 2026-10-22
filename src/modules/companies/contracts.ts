import { z } from "zod";

const optionalText = (maximum: number) =>
  z
    .string()
    .trim()
    .max(maximum)
    .transform((value) => value || null);
export const companyInput = z
  .object({
    name: z.string().trim().min(2).max(200),
    cin: optionalText(21).refine(
      (value) => !value || /^[A-Z0-9]{21}$/.test(value),
      "CIN must contain 21 uppercase letters or digits",
    ),
    companyType: z.enum(["Private company", "Public company", "LLP", "Other"]),
    address: optionalText(1000),
    contactEmail: z
      .union([z.email().max(254), z.literal("")])
      .transform((value) => value || null),
  })
  .strict();
export const directorInput = z
  .object({
    name: z.string().trim().min(2).max(200),
    din: optionalText(8).refine(
      (value) => !value || /^\d{8}$/.test(value),
      "DIN must contain eight digits",
    ),
    designation: z.string().trim().min(2).max(120),
  })
  .strict();
export const companyQuery = z.object({
  q: z.string().trim().max(200).default(""),
  page: z.coerce.number().int().min(1).max(10000).default(1),
  archived: z.enum(["active", "all"]).default("active"),
});
export type CompanyInput = z.output<typeof companyInput>;
export type DirectorInput = z.output<typeof directorInput>;
export type CompanyQuery = z.output<typeof companyQuery>;
export type CompanyRecord = Omit<CompanyInput, "companyType"> & {
  companyType: string | null;
  id: string;
  firmId: string;
  archivedAt: Date | null;
  createdAt: Date;
};
export type DirectorRecord = {
  id: string;
  directorId: string;
  name: string;
  din: string | null;
  designation: string;
};
export type WriteContext = {
  firmId: string;
  userId: string;
  requestId: string;
};
export type CompanyRepository = {
  list(
    firmId: string,
    query: CompanyQuery,
  ): Promise<{ items: CompanyRecord[]; total: number }>;
  find(firmId: string, id: string): Promise<CompanyRecord | undefined>;
  directors(firmId: string, companyId: string): Promise<DirectorRecord[]>;
  create(context: WriteContext, input: CompanyInput): Promise<CompanyRecord>;
  update(
    context: WriteContext,
    id: string,
    input: CompanyInput,
  ): Promise<CompanyRecord | undefined>;
  archive(
    context: WriteContext,
    id: string,
    archived: boolean,
  ): Promise<CompanyRecord | undefined>;
  addDirector(
    context: WriteContext,
    companyId: string,
    input: DirectorInput,
  ): Promise<DirectorRecord | undefined>;
  updateDirector(
    context: WriteContext,
    companyId: string,
    id: string,
    input: DirectorInput,
  ): Promise<DirectorRecord | undefined>;
  removeDirector(
    context: WriteContext,
    companyId: string,
    id: string,
  ): Promise<boolean>;
};
