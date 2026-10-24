import { documents } from "@/platform/application/services";
import { firmEndpoint, resourceId } from "@/platform/http/business";
import { attachmentHeader } from "@/platform/http/documents";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function GET(
  request: Request,
  context: { params: Promise<{ firmId: string; documentId: string }> },
) {
  const { firmId, documentId } = await context.params;
  return firmEndpoint(request, firmId, async (actor, id) => {
    const file = await documents().download(actor, resourceId(documentId), id);
    return new Response(file.stream, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": attachmentHeader(file.name),
        "X-Content-Type-Options": "nosniff",
        "Content-Length": String(file.sizeBytes),
      },
    });
  });
}
