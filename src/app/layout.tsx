import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "메모장",
  description: "에버노트 스타일 개인 메모장",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
