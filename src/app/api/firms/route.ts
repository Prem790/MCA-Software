import { businessResponse } from "@/platform/http/business";
import { requireSession } from "@/platform/auth/session";
import { firms } from "@/platform/application/services";
export const dynamic = "force-dynamic";
export function GET(request: Request) {
  return businessResponse(async () =>
    firms().listForUser((await requireSession(request.headers)).user.id),
  );
}
