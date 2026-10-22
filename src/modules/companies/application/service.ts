import { ApplicationError } from "@/platform/http/errors";
import { canManageCompanies, type Actor } from "@/modules/firms";
import {
  companyInput,
  companyQuery,
  directorInput,
  type CompanyRepository,
} from "../contracts";

export function companyService(repository: CompanyRepository) {
  const writable = (actor: Actor, requestId: string) => {
    if (!canManageCompanies(actor.role))
      throw new ApplicationError(
        "FORBIDDEN",
        "Your role cannot change company records.",
      );
    return { firmId: actor.firmId, userId: actor.userId, requestId };
  };
  const found = <T>(value: T | undefined): T => {
    if (!value)
      throw new ApplicationError("NOT_FOUND", "Company record was not found.");
    return value;
  };
  return {
    list(actor: Actor, query: unknown) {
      return repository.list(actor.firmId, companyQuery.parse(query));
    },
    async detail(actor: Actor, id: string) {
      const company = found(await repository.find(actor.firmId, id));
      return {
        company,
        directors: await repository.directors(actor.firmId, id),
      };
    },
    create(actor: Actor, input: unknown, requestId: string) {
      const context = writable(actor, requestId);
      return repository.create(context, companyInput.parse(input));
    },
    async update(actor: Actor, id: string, input: unknown, requestId: string) {
      const context = writable(actor, requestId);
      return found(
        await repository.update(context, id, companyInput.parse(input)),
      );
    },
    async archive(
      actor: Actor,
      id: string,
      archived: boolean,
      requestId: string,
    ) {
      return found(
        await repository.archive(writable(actor, requestId), id, archived),
      );
    },
    async addDirector(
      actor: Actor,
      companyId: string,
      input: unknown,
      requestId: string,
    ) {
      const context = writable(actor, requestId);
      return found(
        await repository.addDirector(
          context,
          companyId,
          directorInput.parse(input),
        ),
      );
    },
    async updateDirector(
      actor: Actor,
      companyId: string,
      id: string,
      input: unknown,
      requestId: string,
    ) {
      const context = writable(actor, requestId);
      return found(
        await repository.updateDirector(
          context,
          companyId,
          id,
          directorInput.parse(input),
        ),
      );
    },
    async removeDirector(
      actor: Actor,
      companyId: string,
      id: string,
      requestId: string,
    ) {
      if (
        !(await repository.removeDirector(
          writable(actor, requestId),
          companyId,
          id,
        ))
      )
        found(undefined);
    },
  };
}
