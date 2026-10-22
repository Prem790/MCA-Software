import { CalendarView, type SearchParams } from "@/features/preview";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  return <CalendarView params={await searchParams} />;
}
