import type { Metadata } from "next";
import "./globals.css";
import "@/features/workspace/styles.css";
import "@/features/preview/styles/shell.css";
import "@/features/preview/styles/components.css";
import "@/features/preview/styles/forms.css";
import "@/features/preview/styles/dashboard.css";
import "@/features/preview/styles/detail.css";
import "@/features/preview/styles/calendar-documents.css";
import "@/features/preview/styles/settings-guide.css";
import "@/features/preview/styles/login.css";
import "@/features/preview/styles/responsive.css";

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
