import { reporting } from "@/platform/application/services";
import { firmEndpoint } from "@/platform/http/business";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function POST(
  request: Request,
  context: { params: Promise<{ firmId: string; kind: string }> },
) {
  const { firmId, kind } = await context.params;
  return firmEndpoint(request, firmId, async (actor, id) => {
    const result = await reporting().export(
      actor,
      kind,
      Object.fromEntries(new URL(request.url).searchParams),
      id,
    );
    return new Response(result.content, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${result.filename}"`,
        "X-Content-Type-Options": "nosniff",
        "X-Report-Count": String(result.count),
      },
    });
  });
}
