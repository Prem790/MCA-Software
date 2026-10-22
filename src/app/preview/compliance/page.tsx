import { AssignmentList, type SearchParams } from "@/features/preview";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  return <AssignmentList params={await searchParams} compliance />;
}
