import { teams } from "@/platform/application/services";
import { invitationEndpoint } from "@/platform/http/invitations";
import { acceptInvitationInput } from "@/modules/firms/team-contracts";
export const dynamic = "force-dynamic";
export function POST(request: Request) {
  return invitationEndpoint(request, (body) =>
    teams().preview(acceptInvitationInput.parse(body).token),
  );
}
