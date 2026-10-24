import { isDateOnly } from "@/lib/work-dates";
export function monthDetails(month: string) {
  const first = `${month}-01`;
  if (!isDateOnly(first)) throw new Error("Unsupported calendar month");
  const date = new Date(`${first}T00:00:00Z`);
  const year = date.getUTCFullYear(),
    index = date.getUTCMonth();
  const last = new Date(Date.UTC(year, index + 1, 0))
    .toISOString()
    .slice(0, 10);
  const adjacent = (delta: number) => {
    const value = new Date(Date.UTC(year, index + delta, 1))
      .toISOString()
      .slice(0, 10);
    return isDateOnly(value) ? value.slice(0, 7) : null;
  };
  const days = Array.from(
    { length: Number(last.slice(8)) },
    (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`,
  );
  return {
    first,
    last,
    days,
    offset: (date.getUTCDay() + 6) % 7,
    previous: adjacent(-1),
    next: adjacent(1),
  };
}
