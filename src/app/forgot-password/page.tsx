import { ForgotPassword } from "@/features/identity/password-recovery";
import { readEmailConfig } from "@/platform/email/configuration";
export const dynamic = "force-dynamic";
export default function Page() {
  return <ForgotPassword emailConfigured={!!readEmailConfig()} />;
}
