import { teams } from "@/platform/application/services";
import { firmEndpoint, jsonBody } from "@/platform/http/business";
export const dynamic = "force-dynamic";
export async function POST(
  request: Request,
  context: { params: Promise<{ firmId: string }> },
) {
  const { firmId } = await context.params;
  return firmEndpoint(
    request,
    firmId,
    async (actor, id) => teams().invite(actor, await jsonBody(request), id),
    201,
  );
}
