import { teams } from "@/platform/application/services";
import { firmEndpoint, jsonBody, resourceId } from "@/platform/http/business";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ firmId: string; membershipId: string }> };
export async function PATCH(request: Request, context: Context) {
  const { firmId, membershipId } = await context.params;
  return firmEndpoint(request, firmId, async (actor, id) => {
    await teams().changeRole(
      actor,
      resourceId(membershipId),
      await jsonBody(request),
      id,
    );
    return { updated: true };
  });
}
export async function DELETE(request: Request, context: Context) {
  const { firmId, membershipId } = await context.params;
  return firmEndpoint(request, firmId, async (actor, id) => {
    await teams().remove(actor, resourceId(membershipId), id);
    return { removed: true };
  });
}
