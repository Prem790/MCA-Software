import { tasks } from "@/platform/application/services";
import { firmEndpoint, jsonBody } from "@/platform/http/business";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ firmId: string }> };
export async function GET(request: Request, context: Context) {
  const { firmId } = await context.params;
  return firmEndpoint(request, firmId, (actor) =>
    tasks().list(actor, Object.fromEntries(new URL(request.url).searchParams)),
  );
}
export async function POST(request: Request, context: Context) {
  const { firmId } = await context.params;
  return firmEndpoint(
    request,
    firmId,
    async (actor, id) => tasks().create(actor, await jsonBody(request), id),
    201,
  );
}
