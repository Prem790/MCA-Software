import { compliance } from "@/platform/application/services";
import { firmEndpoint, jsonBody, resourceId } from "@/platform/http/business";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ firmId: string; obligationId: string }> };
export async function GET(request: Request, context: Context) {
  const { firmId, obligationId } = await context.params;
  return firmEndpoint(request, firmId, (actor) =>
    compliance().detail(actor, resourceId(obligationId)),
  );
}
export async function PATCH(request: Request, context: Context) {
  const { firmId, obligationId } = await context.params;
  return firmEndpoint(request, firmId, async (actor, id) =>
    compliance().update(
      actor,
      resourceId(obligationId),
      await jsonBody(request),
      id,
    ),
  );
}
