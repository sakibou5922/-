import type { Metadata } from "next";
import { Noto_Serif_JP } from "next/font/google";
import type { ReactNode } from "react";
import { PreviewBanner } from "@/components/PreviewBanner";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { BRAND, isPublicRelease, siteUrl } from "@/lib/site";
import "./globals.css";

/** 見出し用の明朝。Android など明朝を持たない端末でも編集物らしい見出しにする（ビルド時に自己ホスト） */
const serif = Noto_Serif_JP({
  weight: ["700"],
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--font-serif-web",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: `${BRAND.brand_name}｜${BRAND.descriptor}`,
    template: `%s｜${BRAND.brand_name}`,
  },
  description:
    "予約システム・POS・キャッシュレス・LINE公式・集客媒体。小さなお店に本当に必要なものを、必要な順番で判断するガイド。8問チェックは無料・登録不要・営業連絡なし。",
  applicationName: BRAND.brand_name,
  robots: isPublicRelease() ? undefined : { index: false, follow: false },
  openGraph: {
    type: "website",
    siteName: BRAND.brand_name,
    locale: "ja_JP",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja" className={serif.variable}>
      <body>
        <a href="#main" className="skip-link">
          本文へ移動
        </a>
        <PreviewBanner />
        <SiteHeader />
        <main id="main">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
