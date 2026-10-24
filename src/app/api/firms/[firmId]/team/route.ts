import { teams } from "@/platform/application/services";
import { firmEndpoint } from "@/platform/http/business";
export const dynamic = "force-dynamic";
export async function GET(
  request: Request,
  context: { params: Promise<{ firmId: string }> },
) {
  const { firmId } = await context.params;
  return firmEndpoint(request, firmId, (actor) =>
    teams().list(actor, {
      page: new URL(request.url).searchParams.get("page") ?? 1,
    }),
  );
}
