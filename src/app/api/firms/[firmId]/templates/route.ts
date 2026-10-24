import { compliance } from "@/platform/application/services";
import { firmEndpoint, jsonBody } from "@/platform/http/business";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ firmId: string }> };
export async function GET(request: Request, context: Context) {
  const { firmId } = await context.params;
  return firmEndpoint(request, firmId, (actor) =>
    compliance().templates(
      actor,
      new URL(request.url).searchParams.get("page") ?? 1,
    ),
  );
}
export async function POST(request: Request, context: Context) {
  const { firmId } = await context.params;
  return firmEndpoint(
    request,
    firmId,
    async (actor, id) =>
      compliance().saveTemplate(actor, await jsonBody(request), id),
    201,
  );
}
