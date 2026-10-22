import { PreviewShell } from "@/features/preview";

export default function PreviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PreviewShell>{children}</PreviewShell>;
}
