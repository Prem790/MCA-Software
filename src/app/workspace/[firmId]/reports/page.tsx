import { redirect } from "next/navigation";
export default async function ReportsHome({
  params,
}: {
  params: Promise<{ firmId: string }>;
}) {
  const { firmId } = await params;
  redirect(`/workspace/${firmId}/reports/tasks`);
}
