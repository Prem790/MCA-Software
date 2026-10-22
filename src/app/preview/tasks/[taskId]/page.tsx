import { notFound } from "next/navigation";
import { AssignmentDetail, tasks } from "@/features/preview";
export default async function Page({
  params,
}: {
  params: Promise<{ taskId: string }>;
}) {
  const { taskId } = await params;
  const task = tasks.find((item) => item.id === taskId);
  if (!task) notFound();
  return <AssignmentDetail task={task} />;
}
