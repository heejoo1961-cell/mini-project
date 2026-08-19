import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "견적 비교 MVP",
  description: "합성 XLSX·CSV 견적 비교 도구",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
