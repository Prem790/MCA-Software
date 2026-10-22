import { firmEndpoint, resourceId } from "@/platform/http/business";
import { companies } from "@/platform/application/services";
export async function POST(
  request: Request,
  context: { params: Promise<{ firmId: string; companyId: string }> },
) {
  const { firmId, companyId } = await context.params;
  return firmEndpoint(request, firmId, (actor, id) =>
    companies().archive(actor, resourceId(companyId), false, id),
  );
}
