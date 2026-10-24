import { teams } from "@/platform/application/services";
import { invitationEndpoint } from "@/platform/http/invitations";
import { getAuth } from "@/platform/auth/server";
export const dynamic = "force-dynamic";
export function POST(request: Request) {
  return invitationEndpoint(request, async (body, id) => {
    const session = await getAuth().api.getSession({
      headers: request.headers,
    });
    return teams().accept(body, session?.user.id, id);
  });
}
