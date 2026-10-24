import { pageActor } from "@/platform/auth/page-session";
import { FirmNavigation } from "@/features/workspace/firm-navigation";
export default async function FirmLayout({
  params,
  children,
}: {
  params: Promise<{ firmId: string }>;
  children: React.ReactNode;
}) {
  const { firmId } = await params;
  const actor = await pageActor(firmId);
  return (
    <div className="live-firm-layout">
      <FirmNavigation
        firmId={firmId}
        firmName={actor.firmName}
        role={actor.role}
      />
      <div className="live-firm-content">{children}</div>
    </div>
  );
}
