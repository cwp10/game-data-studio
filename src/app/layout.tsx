import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Game Data Studio",
  description: "게임 수치 데이터 기획 자동화 툴",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
