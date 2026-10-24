import { redirect } from "next/navigation";
export default async function FirmHome({
  params,
}: {
  params: Promise<{ firmId: string }>;
}) {
  const { firmId } = await params;
  redirect(`/workspace/${firmId}/dashboard`);
}
