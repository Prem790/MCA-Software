import "server-only";
import { reportingRepository, reportingService } from "@/modules/reporting";
import { documentRepository, documentService } from "@/modules/documents";
import { privateBlobStorage } from "@/platform/storage/private-blob";
import { companyRepository, companyService } from "@/modules/companies";
import {
  firmRepository,
  teamService,
  teamRepository,
  invitationTokens,
} from "@/modules/firms";
import { hashPassword } from "better-auth/crypto";
import { invitationDelivery } from "@/platform/email/invitations";
import { getDatabase } from "@/platform/database/client";
import { complianceRepository, complianceService } from "@/modules/compliance";
import {
  taskRepository,
  taskService,
  reviewRepository,
} from "@/modules/tasks/server";

export const companies = () => companyService(companyRepository(getDatabase()));
export const firms = () => firmRepository(getDatabase());
export const compliance = () =>
  complianceService(complianceRepository(getDatabase()));
export const tasks = () => taskService(taskRepository(getDatabase()));
export const teams = () =>
  teamService(
    teamRepository(getDatabase()),
    invitationDelivery,
    invitationTokens,
    hashPassword,
  );
export const reviews = () => reviewRepository(getDatabase());
export const documents = () =>
  documentService(documentRepository(getDatabase()), privateBlobStorage());
export const reporting = () =>
  reportingService(reportingRepository(getDatabase()));
