import { tasks } from "@/platform/application/services";
import { firmEndpoint, jsonBody, resourceId } from "@/platform/http/business";
export const dynamic = "force-dynamic";
type Context = {
  params: Promise<{ firmId: string; taskId: string; itemId: string }>;
};
export async function PATCH(request: Request, context: Context) {
  const { firmId, taskId, itemId } = await context.params;
  return firmEndpoint(request, firmId, async (actor, id) => {
    await tasks().toggleChecklist(
      actor,
      resourceId(taskId),
      resourceId(itemId),
      await jsonBody(request),
      id,
    );
    return { updated: true };
  });
}
export async function DELETE(request: Request, context: Context) {
  const { firmId, taskId, itemId } = await context.params;
  return firmEndpoint(request, firmId, async (actor, id) => {
    await tasks().removeChecklist(
      actor,
      resourceId(taskId),
      resourceId(itemId),
      await jsonBody(request),
      id,
    );
    return { removed: true };
  });
}
