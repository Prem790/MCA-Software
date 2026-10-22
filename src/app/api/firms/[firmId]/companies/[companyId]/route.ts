import { firmEndpoint, jsonBody, resourceId } from "@/platform/http/business";
import { companies } from "@/platform/application/services";
type Context = { params: Promise<{ firmId: string; companyId: string }> };
export async function GET(request: Request, context: Context) {
  const { firmId, companyId } = await context.params;
  return firmEndpoint(request, firmId, (actor) =>
    companies().detail(actor, resourceId(companyId)),
  );
}
export async function PATCH(request: Request, context: Context) {
  const { firmId, companyId } = await context.params;
  return firmEndpoint(request, firmId, async (actor, id) =>
    companies().update(
      actor,
      resourceId(companyId),
      await jsonBody(request),
      id,
    ),
  );
}
export async function DELETE(request: Request, context: Context) {
  const { firmId, companyId } = await context.params;
  return firmEndpoint(request, firmId, (actor, id) =>
    companies().archive(actor, resourceId(companyId), true, id),
  );
}
