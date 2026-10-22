import { firmEndpoint, jsonBody } from "@/platform/http/business";
import { companies } from "@/platform/application/services";
type Context = { params: Promise<{ firmId: string }> };
export async function GET(request: Request, context: Context) {
  const { firmId } = await context.params;
  return firmEndpoint(request, firmId, (actor) =>
    companies().list(
      actor,
      Object.fromEntries(new URL(request.url).searchParams),
    ),
  );
}
export async function POST(request: Request, context: Context) {
  const { firmId } = await context.params;
  return firmEndpoint(
    request,
    firmId,
    async (actor, id) => companies().create(actor, await jsonBody(request), id),
    201,
  );
}
