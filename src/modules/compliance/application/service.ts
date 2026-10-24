import { ApplicationError } from "@/platform/http/errors";
import { indiaToday } from "@/lib/work-dates";
import type { Actor } from "@/modules/firms";
import {
  obligationInput,
  obligationQuery,
  obligationUpdate,
  nextOccurrenceInput,
  templateInput,
  templateUpdate,
  type ComplianceRepository,
} from "../contracts";
export function complianceService(repository: ComplianceRepository) {
  const write = (actor: Actor, requestId: string) => {
    if (actor.role === "staff")
      throw new ApplicationError(
        "FORBIDDEN",
        "Only admins and managers can manage obligations.",
      );
    return { ...actor, requestId };
  };
  return {
    templates(actor: Actor, page: unknown) {
      return repository.templates(
        actor.firmId,
        obligationQuery.parse({ page }).page,
      );
    },
    template(actor: Actor, id: string) {
      return repository.template(actor.firmId, id);
    },
    async saveTemplate(
      actor: Actor,
      input: unknown,
      requestId: string,
      id?: string,
    ) {
      return repository.saveTemplate(
        write(actor, requestId),
        id ? templateUpdate.parse(input) : templateInput.parse(input),
        id,
      );
    },
    async archiveTemplate(actor: Actor, id: string, requestId: string) {
      return repository.archiveTemplate(write(actor, requestId), id);
    },
    list(actor: Actor, query: unknown) {
      return repository.list(
        actor.firmId,
        obligationQuery.parse(query),
        indiaToday(),
      );
    },
    detail(actor: Actor, id: string) {
      return repository.detail(actor.firmId, id);
    },
    async create(actor: Actor, input: unknown, requestId: string) {
      return repository.create(
        write(actor, requestId),
        obligationInput.parse(input),
      );
    },
    async update(actor: Actor, id: string, input: unknown, requestId: string) {
      return repository.update(
        write(actor, requestId),
        id,
        obligationUpdate.parse(input),
      );
    },
    async next(actor: Actor, id: string, input: unknown, requestId: string) {
      return repository.next(
        write(actor, requestId),
        id,
        nextOccurrenceInput.parse(input),
      );
    },
  };
}
