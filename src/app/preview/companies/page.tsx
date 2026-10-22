import { CompanyList, type SearchParams } from "@/features/preview";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  return <CompanyList params={await searchParams} />;
}
