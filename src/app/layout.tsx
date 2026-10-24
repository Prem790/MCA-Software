import type { Metadata } from "next";
import "./globals.css";
import "@/styles/brand.css";
import "@/styles/components.css";
import "@/styles/forms.css";
import "@/features/marketing/styles.css";
import "@/features/workspace/styles.css";

export const metadata: Metadata = {
  title: "MCA Software",
  description:
    "Corporate compliance and practice management for professional firms.",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
