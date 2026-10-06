import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { StatusBadge } from "@/components/StatusBadge";
import { BRAND, absoluteUrl } from "@/lib/site";
import type { Status } from "@/lib/decision/types";

export const metadata: Metadata = {
  title: "開業の順番｜何を・いつ決めるか",
  description:
    "小さなお店の開業で、サービスを入れる順番。無料で先に整えるGoogleの店舗情報から、予約の受け方、支払い、レジ、帳簿、LINE、外部媒体、連携の見直しまで。何を・いつ決めるかを8ステップで。",
  alternates: { canonical: "/guide/opening-order" },
};

interface Step {
  title: string;
  status: Status;
  when: string;
  rule: string;
  href?: string;
}

const STEPS: Step[] = [
  {
    title: "Googleビジネスプロフィールを整える",
    status: "FREE_FOUNDATION",
    when: "開業日が決まったらすぐ。営業中なら今日。",
    rule: "無料。店名・地域で検索されたときの受け皿になる。営業時間・写真・説明文・電話番号を埋め、口コミに返信する。どの業態でも先に整えて損がない。",
  },
  {
    title: "予約の「受け方」を1つに決める",
    status: "NOW",
    when: "開業30日前まで。",
    rule: "電話・LINE・DM・予約ページのうち、どこに寄せるかを決める。システムを入れるかより先に、経路を分散させないことが大事。予約中心なら無料プランで予約ページを試す。",
    href: "/need/reservation-system",
  },
  {
    title: "支払い方法を決める",
    status: "NEXT",
    when: "開業30日前まで。",
    rule: "まず現金と振込。店頭決済が多い・要望がある・客単価が高めなら、固定費ゼロの候補で試算してキャッシュレスを足す。店頭決済がほぼないなら今は入れない。",
    href: "/need/cashless-payment",
  },
  {
    title: "売上の記録方法（レジ）を決める",
    status: "NEXT",
    when: "開業前。",
    rule: "ひとり・在庫なし・メニュー少なめなら、無料レジアプリか手書きで十分。在庫・品目・スタッフ・分析が増えたらPOSを検討する。",
    href: "/need/pos-register",
  },
  {
    title: "帳簿の方法を決める",
    status: "NEXT",
    when: "開業30日前まで。",
    rule: "自分で記帳するか税理士に任せるかを決める。自分でやるなら、銀行・カード明細を自動で取り込めるソフトを選ぶ。取引が増える前に決めると後が楽。",
  },
  {
    title: "再来の接点（LINE公式など）を作る",
    status: "LATER",
    when: "再来客が見えてきてから（開業後）。",
    rule: "無料だから作るのではなく、何を・誰に・月何回送るかが決まってから。開業前で顧客がいない段階では、新規集客や営業準備が先。",
    href: "/need/line-official",
  },
  {
    title: "外部の集客媒体を検討する",
    status: "LATER",
    when: "新規客の不足が数字で見えてから。",
    rule: "媒体は「新規客を買う」手段。月に払える上限、測る数字（新規数・CAC・再来率）、依存度の上限を決めてから問い合わせる。先にGoogleと直接の導線を整える。",
    href: "/need/hotpepper-beauty",
  },
  {
    title: "サービス間の連携を見直す",
    status: "LATER",
    when: "3つ以上のサービスを使い、二重入力が出てきたら。",
    rule: "新しいサービスを足す前に、手で入力し直している項目を書き出す。既製サービス同士の連携で消せるものから試し、消えないものだけ仕組みづくりを検討する。",
  },
];

export default function OpeningOrderPage() {
  return (
    <div className="container">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: "開業の順番｜何を・いつ決めるか",
          inLanguage: "ja",
          datePublished: "2026-10-06",
          dateModified: "2026-10-06",
          mainEntityOfPage: absoluteUrl("/guide/opening-order"),
          author: { "@type": "Organization", name: BRAND.brand_name },
          publisher: { "@type": "Organization", name: BRAND.brand_name, url: absoluteUrl("/") },
        }}
      />
      <Breadcrumbs items={[{ name: "開業の順番", href: "/guide/opening-order" }]} />
      <div className="page-title">
        <h1>開業の順番｜何を・いつ決めるか</h1>
        <p>
          「入れるのが普通」と言われる順ではなく、お店が回る順です。上から順に、無料で整えるものから。各ステップの「いつ」「判断の基準」は目安で、あなたの店の条件は<Link href="/check">8問チェック</Link>で確かめられます。
        </p>
      </div>

      <section className="section section--tight">
        <ol className="steps">
          {STEPS.map((s) => (
            <li key={s.title}>
              <div>
                <h2>
                  {s.title}
                  <span className="step__status">
                    <StatusBadge status={s.status} />
                  </span>
                </h2>
                <p>
                  <strong>いつ：</strong>
                  {s.when}
                </p>
                <p>
                  <strong>判断の基準：</strong>
                  {s.rule}
                </p>
                {s.href && (
                  <p>
                    <Link href={s.href}>この判断の記事を読む →</Link>
                  </p>
                )}
              </div>
            </li>
          ))}
        </ol>
        <div className="notice notice--muted" style={{ marginTop: 28 }}>
          順番のラベルは一般的な目安です。例えば予約中心でスタッフが複数なら予約システムが「今」に、飛び込み中心なら「今は優先しない」になります。
        </div>
        <div className="btn-row" style={{ marginTop: 24 }}>
          <Link href="/check" className="btn btn--primary">
            8問で、自分の店の順番を出す
          </Link>
          <Link href="/need" className="btn btn--secondary">
            気になるサービスから確認する
          </Link>
        </div>
      </section>
    </div>
  );
}
