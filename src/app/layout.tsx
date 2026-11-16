import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// 배포 도메인: Vercel 배포 후 실제 도메인으로 교체할 것.
// OG 미리보기(카톡 공유)가 바이럴 핵심이라 절대 URL이 필수다.
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://lovetap.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "LoveTap — 우리 커플 싱크로율 테스트",
  description:
    "밸런스 퀴즈 5문제로 알아보는 우리 커플 싱크로율! 출제하고, 상대가 풀면, 결과를 카드로 저장해 공유해요.",
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: SITE_URL,
    siteName: "LoveTap",
    title: "LoveTap — 우리 커플 싱크로율 테스트",
    description:
      "밸런스 퀴즈 5문제로 알아보는 우리 커플 싱크로율! 너랑 나는 몇 % 맞을까?",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "LoveTap — 우리 커플 싱크로율 테스트",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "LoveTap — 우리 커플 싱크로율 테스트",
    description:
      "밸런스 퀴즈 5문제로 알아보는 우리 커플 싱크로율! 너랑 나는 몇 % 맞을까?",
    images: ["/og.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#fff6ec",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
