import type { Metadata } from "next";
import { QuoteWorkflowProvider } from "../context/QuoteWorkflowContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "Quote Standard | 견적 비교를 쉽고 명확하게",
  description: "구매 실무자를 위한 PDF 견적서 등록 및 비교 준비 서비스",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body><QuoteWorkflowProvider>{children}</QuoteWorkflowProvider></body>
    </html>
  );
}
