import type { Metadata } from "next";
import "./globals.css";
import { StoreProvider } from "@/lib/store";
import Shell from "@/components/Shell";

export const metadata: Metadata = {
  title: "JobFilter — 컴공 맞춤 취업지원 포털 MVP",
  description: "공고는 자동으로, 자소서는 내가 직접. 키워드 기반 분석 컴퓨터공학과 맞춤 취업지원 포털.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen">
        <StoreProvider>
          <Shell>{children}</Shell>
        </StoreProvider>
      </body>
    </html>
  );
}
