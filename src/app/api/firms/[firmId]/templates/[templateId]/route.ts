import { compliance } from "@/platform/application/services";
import { firmEndpoint, jsonBody, resourceId } from "@/platform/http/business";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ firmId: string; templateId: string }> };
export async function PATCH(request: Request, context: Context) {
  const { firmId, templateId } = await context.params;
  return firmEndpoint(request, firmId, async (actor, id) =>
    compliance().saveTemplate(
      actor,
      await jsonBody(request),
      id,
      resourceId(templateId),
    ),
  );
}
export async function DELETE(request: Request, context: Context) {
  const { firmId, templateId } = await context.params;
  return firmEndpoint(request, firmId, async (actor, id) => {
    await compliance().archiveTemplate(actor, resourceId(templateId), id);
    return { archived: true };
  });
}
