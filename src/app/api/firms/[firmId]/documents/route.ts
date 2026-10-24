import { documents } from "@/platform/application/services";
import { firmEndpoint } from "@/platform/http/business";
import { documentBody } from "@/platform/http/documents";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function GET(
  request: Request,
  context: { params: Promise<{ firmId: string }> },
) {
  const { firmId } = await context.params;
  return firmEndpoint(request, firmId, async (actor) =>
    documents().list(
      actor,
      Object.fromEntries(new URL(request.url).searchParams),
    ),
  );
}
export async function POST(
  request: Request,
  context: { params: Promise<{ firmId: string }> },
) {
  const { firmId } = await context.params;
  return firmEndpoint(
    request,
    firmId,
    async (actor, id) =>
      documents().upload(
        actor,
        Object.fromEntries(new URL(request.url).searchParams),
        await documentBody(request),
        id,
      ),
    201,
  );
}
