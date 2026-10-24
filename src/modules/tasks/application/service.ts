import { ApplicationError } from "@/platform/http/errors";
import type { Actor } from "@/modules/firms";
import { indiaToday } from "@/lib/work-dates";
import {
  checklistInput,
  checklistToggle,
  commentInput,
  commentQuery,
  statusInput,
  taskInput,
  taskQuery,
  taskUpdate,
  versionInput,
  type TaskRepository,
} from "../contracts";
export function taskService(repository: TaskRepository) {
  const manager = (actor: Actor, id: string) => {
    if (actor.role === "staff")
      throw new ApplicationError(
        "FORBIDDEN",
        "Only admins and managers can create or assign tasks.",
      );
    return { ...actor, requestId: id };
  };
  return {
    options(actor: Actor) {
      return repository.options(actor.firmId);
    },
    list(actor: Actor, query: unknown) {
      return repository.list(actor, taskQuery.parse(query), indiaToday());
    },
    detail(actor: Actor, id: string, query: unknown = {}) {
      return repository.detail(
        actor.firmId,
        id,
        commentQuery.parse(query).commentPage,
      );
    },
    async create(actor: Actor, input: unknown, id: string) {
      return repository.create(manager(actor, id), taskInput.parse(input));
    },
    async update(actor: Actor, taskId: string, input: unknown, id: string) {
      return repository.update(
        manager(actor, id),
        taskId,
        taskUpdate.parse(input),
      );
    },
    async transition(actor: Actor, taskId: string, input: unknown, id: string) {
      return repository.transition(
        { ...actor, requestId: id },
        taskId,
        statusInput.parse(input),
      );
    },
    async addChecklist(
      actor: Actor,
      taskId: string,
      input: unknown,
      id: string,
    ) {
      return repository.addChecklist(
        manager(actor, id),
        taskId,
        checklistInput.parse(input),
      );
    },
    async toggleChecklist(
      actor: Actor,
      taskId: string,
      itemId: string,
      input: unknown,
      id: string,
    ) {
      return repository.toggleChecklist(
        { ...actor, requestId: id },
        taskId,
        itemId,
        checklistToggle.parse(input),
      );
    },
    async removeChecklist(
      actor: Actor,
      taskId: string,
      itemId: string,
      input: unknown,
      id: string,
    ) {
      return repository.removeChecklist(
        manager(actor, id),
        taskId,
        itemId,
        versionInput.parse(input).version,
      );
    },
    async comment(actor: Actor, taskId: string, input: unknown, id: string) {
      return repository.comment(
        { ...actor, requestId: id },
        taskId,
        commentInput.parse(input).body,
      );
    },
  };
}
