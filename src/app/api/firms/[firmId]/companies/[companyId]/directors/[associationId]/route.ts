import { firmEndpoint, jsonBody, resourceId } from "@/platform/http/business";
import { companies } from "@/platform/application/services";
type Context = {
  params: Promise<{ firmId: string; companyId: string; associationId: string }>;
};
export async function PATCH(request: Request, context: Context) {
  const { firmId, companyId, associationId } = await context.params;
  return firmEndpoint(request, firmId, async (actor, id) =>
    companies().updateDirector(
      actor,
      resourceId(companyId),
      resourceId(associationId),
      await jsonBody(request),
      id,
    ),
  );
}
export async function DELETE(request: Request, context: Context) {
  const { firmId, companyId, associationId } = await context.params;
  return firmEndpoint(request, firmId, async (actor, id) => {
    await companies().removeDirector(
      actor,
      resourceId(companyId),
      resourceId(associationId),
      id,
    );
    return { removed: true };
  });
}
