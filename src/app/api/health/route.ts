import { requestId } from "@/platform/http/responses";

export const dynamic = "force-dynamic";

export function GET() {
  const id = requestId();
  return Response.json(
    { status: "ok", service: "mca-software", requestId: id },
    {
      headers: { "Cache-Control": "no-store", "X-Request-Id": id },
    },
  );
}
