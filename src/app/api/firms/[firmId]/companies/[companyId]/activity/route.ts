import { firmEndpoint, resourceId } from "@/platform/http/business";
import { companies } from "@/platform/application/services";
import { listAudit } from "@/modules/audit";
import { getDatabase } from "@/platform/database/client";
export async function GET(
  request: Request,
  context: { params: Promise<{ firmId: string; companyId: string }> },
) {
  const { firmId, companyId } = await context.params;
  return firmEndpoint(request, firmId, async (actor) => {
    await companies().detail(actor, resourceId(companyId));
    return listAudit(getDatabase(), actor.firmId, companyId);
  });
}
