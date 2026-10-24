import { reviews } from "@/platform/application/services";
import { firmEndpoint, jsonBody, resourceId } from "@/platform/http/business";
export const dynamic = "force-dynamic";
export async function POST(
  request: Request,
  context: { params: Promise<{ firmId: string; taskId: string }> },
) {
  const { firmId, taskId } = await context.params;
  return firmEndpoint(request, firmId, async (actor, requestId) =>
    reviews().decide(
      { ...actor, requestId },
      resourceId(taskId),
      await jsonBody(request),
    ),
  );
}
