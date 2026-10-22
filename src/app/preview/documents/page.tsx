import { DocumentList, type SearchParams } from "@/features/preview";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  return <DocumentList params={await searchParams} />;
}
