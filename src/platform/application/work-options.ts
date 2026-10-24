import "server-only";
import type { Actor } from "@/modules/firms";
import { companies, tasks } from "./services";
export async function workOptions(actor: Actor, companyId?: string) {
  const options = await tasks().options(actor);
  if (companyId && !options.companies.some((item) => item.id === companyId)) {
    const detail = await companies().detail(actor, companyId);
    options.companies.unshift({
      id: detail.company.id,
      name:
        detail.company.name + (detail.company.archivedAt ? " (archived)" : ""),
    });
  }
  return options;
}
