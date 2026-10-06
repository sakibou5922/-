import type { Metadata } from "next";
import Link from "next/link";
import { HeroDecisionVisual } from "@/components/HeroDecisionVisual";
import { JsonLd } from "@/components/JsonLd";
import { TrackView } from "@/components/TrackView";
import { ARTICLES, articleHref } from "@/lib/content/articles";
import { BRAND, absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: `${BRAND.brand_name}｜${BRAND.descriptor}`,
  description:
    "そのサービス、本当に今のお店に必要ですか？ HOT PEPPER Beauty・LINE・予約システム・POS・キャッシュレス。小さなお店に「必要」「あとでいい」「今はいらない」を、8問で整理します。無料・登録不要・営業連絡なし。",
  alternates: { canonical: absoluteUrl("/") },
};

export default function HomePage() {
  return (
    <>
      <TrackView name="entry_view" props={{ page: "top" }} />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Organization",
              "@id": `${absoluteUrl("/")}#organization`,
              name: BRAND.brand_name,
              url: absoluteUrl("/"),
            },
            {
              "@type": "WebSite",
              "@id": `${absoluteUrl("/")}#website`,
              name: BRAND.brand_name,
              url: absoluteUrl("/"),
              inLanguage: "ja",
              publisher: { "@id": `${absoluteUrl("/")}#organization` },
            },
          ],
        }}
      />

      <section className="hero">
        <div className="container hero__grid">
          <div>
            <h1>そのサービス、本当に今のお店に必要ですか？</h1>
            <p className="hero__lead">
              HOT PEPPER Beauty、LINE、予約システム、POS、キャッシュレス。お店を始めると「入れるのが普通」と言われるものが増えます。でも、予約の取り方、支払い方、人数、集客方法によって、必要なものも順番も違います。
            </p>
            <p className="hero__lead">{BRAND.brand_name}は「必要」「あとでいい」「今はいらない」を整理します。</p>
            <div className="hero__cta">
              <Link href="/check" className="btn btn--primary">
                8問で、今入れるものを確認する
              </Link>
              <p className="btn-support">無料・登録不要・営業連絡なし</p>
            </div>
            <p className="hero__secondary">
              <Link href="/need">気になるサービスから確認する →</Link>
            </p>
          </div>
          <HeroDecisionVisual />
        </div>
      </section>

      <section className="section" aria-labelledby="need-heading">
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">気になるサービスから</span>
            <h2 id="need-heading">「本当に必要？」を、お店の条件で答える</h2>
            <p>
              それぞれの記事は、結論 → 使われる理由 → 費用の事実 → 判断表 → 5問のミニチェック → 代替案 → 次の行動、の順に進みます。サービスを勧めるための記事ではなく、入れない判断もできる記事です。
            </p>
          </div>
          <div className="card-grid card-grid--3">
            {ARTICLES.map((a) => (
              <Link key={a.slug} href={articleHref(a.slug)} className="card article-card">
                <span className="article-card__kicker">本当に必要？</span>
                <h3>{a.shortTitle.replace(/は本当に必要？$/, "")}</h3>
                <p>{a.immediateAnswer[0]}</p>
                <span className="article-card__more">判断基準を読む →</span>
              </Link>
            ))}
            <Link href="/guide/opening-order" className="card article-card">
              <span className="article-card__kicker">順番</span>
              <h3>開業の順番</h3>
              <p>無料で整える土台から、連携の見直しまで。何を・いつ決めるかを8ステップで。</p>
              <span className="article-card__more">順番を見る →</span>
            </Link>
          </div>
        </div>
      </section>

      <section className="section" style={{ background: "var(--paper-2)" }} aria-labelledby="how-heading">
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">このサイトの考え方</span>
            <h2 id="how-heading">{BRAND.core_message}</h2>
          </div>
          <dl className="principles">
            <div>
              <dt>点数ではなく、理由で判断</dt>
              <dd>8問の回答から、予約の取り方・支払い方・人数・再来の割合をもとに「今」「次」「まだ不要」を決めます。結果には理由を添え、点数は見せません。</dd>
            </div>
            <div>
              <dt>紹介報酬は、判断に影響しない</dt>
              <dd>必要かどうかの判断と、サービス候補の表示は別の仕組みです。報酬の額で順位を変えず、報酬のない公式の選択肢も同じ条件で並べます。</dd>
            </div>
            <div>
              <dt>入れない判断にも、代わりがある</dt>
              <dd>「今はいらない」で終わらせず、何で代替するか、いつ見直すか、導入後に何を測るかまで添えます。</dd>
            </div>
          </dl>
          <p style={{ marginTop: 20 }}>
            <Link href="/editorial-policy">編集方針を読む</Link>
            {" ／ "}
            <Link href="/advertising-policy">広告・収益の方針を読む</Link>
          </p>
        </div>
      </section>

      <div className="sticky-cta">
        <Link href="/check" className="btn btn--primary">
          8問で、今入れるものを確認する
        </Link>
      </div>
    </>
  );
}
