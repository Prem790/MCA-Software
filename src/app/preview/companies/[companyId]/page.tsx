import { notFound } from "next/navigation";
import {
  CompanyDetail,
  companies,
  queryText,
  type SearchParams,
} from "@/features/preview";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ companyId: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { companyId } = await params;
  const company = companies.find((item) => item.id === companyId);
  if (!company) notFound();
  return (
    <CompanyDetail
      company={company}
      tab={queryText((await searchParams).tab)}
    />
  );
}
