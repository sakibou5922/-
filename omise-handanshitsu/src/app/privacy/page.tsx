import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { BRAND } from "@/lib/site";

export const metadata: Metadata = {
  title: "プライバシー",
  description: `${BRAND.brand_name}のプライバシーの方針。登録不要、個人情報を求めない、診断の回答を保存しない、計測の範囲。`,
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <div className="container narrow">
      <Breadcrumbs items={[{ name: "プライバシー", href: "/privacy" }]} />
      <div className="page-title">
        <h1>プライバシー</h1>
        <p>個人情報を求めない設計にしています。</p>
      </div>
      <div className="prose section section--tight">
        <dl className="policy-list">
          <dt>登録・ログイン</dt>
          <dd>ありません。氏名・メールアドレス・電話番号などの入力を求めるページはありません。</dd>
          <dt>8問チェック・ミニチェックの回答</dt>
          <dd>
            サーバーには保存しません。結果ページのURLに回答（お店の段階・業種・予約の取り方など、個人を特定しない選択肢）が含まれ、同じURLを開くと同じ結果が出ます。URLを他の人に送ると回答の内容も伝わるため、共有の際はご注意ください。記事のミニチェックの回答は、同じ質問を再び聞かないために、ブラウザを閉じるまでの一時保存（セッションストレージ）に置きます。
          </dd>
          <dt>アクセス計測</dt>
          <dd>
            ページの表示や診断の開始・完了といった操作の回数を、個人を特定しない形で計測することがあります。回答の内容そのものは計測に含めません。現在、外部の計測サービスは組み込んでいません。
          </dd>
          <dt>Cookie</dt>
          <dd>このサイト自身は、識別のためのCookieを使いません。</dd>
          <dt>外部サイトへのリンク</dt>
          <dd>各サービスの公式サイトや紹介リンク先では、それぞれのプライバシーポリシーが適用されます。紹介リンクには PR 表示を付けています（<Link href="/advertising-policy">広告・収益の方針</Link>）。</dd>
          <dt>お問い合わせ</dt>
          <dd>
            <Link href="/operator">運営者情報</Link>をご覧ください。
          </dd>
        </dl>
      </div>
    </div>
  );
}
