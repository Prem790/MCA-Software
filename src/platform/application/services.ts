import "server-only";
import { companyRepository, companyService } from "@/modules/companies";
import { firmRepository } from "@/modules/firms";
import { getDatabase } from "@/platform/database/client";

export const companies = () => companyService(companyRepository(getDatabase()));
export const firms = () => firmRepository(getDatabase());
