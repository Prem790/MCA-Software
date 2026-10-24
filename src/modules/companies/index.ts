export { companyService } from "./application/service";
export { companyRepository } from "./infrastructure/repository";
export type { CompanyRecord, DirectorRecord } from "./contracts";
export { lockActiveCompany } from "./infrastructure/work-context";
