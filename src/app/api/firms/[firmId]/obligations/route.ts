import { compliance } from "@/platform/application/services";
import { firmEndpoint, jsonBody } from "@/platform/http/business";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ firmId: string }> };
export async function GET(request: Request, context: Context) {
  const { firmId } = await context.params;
  return firmEndpoint(request, firmId, (actor) =>
    compliance().list(
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
    async (actor, id) =>
      compliance().create(actor, await jsonBody(request), id),
    201,
  );
}
