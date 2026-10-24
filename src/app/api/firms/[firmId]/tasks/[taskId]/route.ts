import { tasks } from "@/platform/application/services";
import { firmEndpoint, jsonBody, resourceId } from "@/platform/http/business";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ firmId: string; taskId: string }> };
export async function GET(request: Request, context: Context) {
  const { firmId, taskId } = await context.params;
  return firmEndpoint(request, firmId, (actor) =>
    tasks().detail(
      actor,
      resourceId(taskId),
      Object.fromEntries(new URL(request.url).searchParams),
    ),
  );
}
export async function PATCH(request: Request, context: Context) {
  const { firmId, taskId } = await context.params;
  return firmEndpoint(request, firmId, async (actor, id) =>
    tasks().update(actor, resourceId(taskId), await jsonBody(request), id),
  );
}
