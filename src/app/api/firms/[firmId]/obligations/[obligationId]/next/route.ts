import { compliance } from "@/platform/application/services";
import { firmEndpoint, jsonBody, resourceId } from "@/platform/http/business";
export const dynamic = "force-dynamic";
export async function POST(
  request: Request,
  context: { params: Promise<{ firmId: string; obligationId: string }> },
) {
  const { firmId, obligationId } = await context.params;
  return firmEndpoint(request, firmId, async (actor, id) =>
    compliance().next(
      actor,
      resourceId(obligationId),
      await jsonBody(request),
      id,
    ),
  );
}
