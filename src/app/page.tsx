import type { Metadata } from "next";
import { MarketingHome } from "@/features/marketing/home";
export const metadata: Metadata = {
  title: "MCA Software | A clearer workspace for secretarial practice",
  description:
    "Organise company records, obligations, assigned tasks, private documents and independent reviews in one connected workspace for your firm.",
  robots: { index: true, follow: true },
};
export default function HomePage() {
  return <MarketingHome />;
}
