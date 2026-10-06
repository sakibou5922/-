import type { Metadata } from "next";
import { Suspense } from "react";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CheckWizard } from "@/components/CheckWizard";

export const metadata: Metadata = {
  title: "8問｜お店に今必要なものチェック",
  description:
    "予約の取り方・支払い方・人数・再来の割合など8問に答えると、予約システム・POS・キャッシュレス・LINE・集客媒体を「今、整える」「次に考える」「今は優先しない」に整理します。無料・登録不要・回答は保存しません。",
  alternates: { canonical: "/check" },
};

export default function CheckPage() {
  return (
    <div className="container narrow check-page">
      <Breadcrumbs items={[{ name: "8問チェック", href: "/check" }]} />
      <div className="page-title">
        <h1>8問｜お店に今必要なものチェック</h1>
        <p>
          1画面に1問、約2分。結果は「無料で先に整える」「今、整える（最大3）」「次に考える（最大2）」「今は優先しない」「既存サービスの見直し」に分かれ、理由と次の行動を添えます。無料・登録不要・営業連絡なし。回答は保存されず、結果ページのURLにだけ含まれます。
        </p>
      </div>
      <section className="section section--tight">
        <Suspense
          fallback={
            <div className="wizard">
              <p className="wizard__help">読み込み中…</p>
            </div>
          }
        >
          <CheckWizard />
        </Suspense>
      </section>
    </div>
  );
}
