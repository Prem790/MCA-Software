import { teams } from "@/platform/application/services";
import { firmEndpoint, resourceId } from "@/platform/http/business";
export const dynamic = "force-dynamic";
export async function DELETE(
  request: Request,
  context: { params: Promise<{ firmId: string; invitationId: string }> },
) {
  const { firmId, invitationId } = await context.params;
  return firmEndpoint(request, firmId, async (actor, id) => {
    await teams().cancel(actor, resourceId(invitationId), id);
    return { cancelled: true };
  });
}
