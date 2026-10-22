import { firmEndpoint, jsonBody, resourceId } from "@/platform/http/business";
import { companies } from "@/platform/application/services";
export async function POST(
  request: Request,
  context: { params: Promise<{ firmId: string; companyId: string }> },
) {
  const { firmId, companyId } = await context.params;
  return firmEndpoint(
    request,
    firmId,
    async (actor, id) =>
      companies().addDirector(
        actor,
        resourceId(companyId),
        await jsonBody(request),
        id,
      ),
    201,
  );
}
