import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CashlessCalculator } from "@/components/CashlessCalculator";
import { Fact } from "@/components/Fact";
import { JsonLd } from "@/components/JsonLd";
import { MiniCheck } from "@/components/MiniCheck";
import { TrackView } from "@/components/TrackView";
import { ARTICLES, articleHref, getArticle } from "@/lib/content/articles";
import { AREA_META } from "@/lib/decision/labels";
import { formatDateJa } from "@/lib/evidence";
import { selectOffers } from "@/lib/offers";
import { BRAND, absoluteUrl } from "@/lib/site";

/** 鮮度判定を定期的にやり直す（料金 30 日ルール） */
export const revalidate = 3600;

interface Props {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return ARTICLES.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const a = getArticle(slug);
  if (!a) return {};
  return {
    title: a.title,
    description: a.description,
    keywords: a.keywords,
    alternates: { canonical: articleHref(a.slug) },
    openGraph: {
      type: "article",
      title: a.title,
      description: a.description,
      url: absoluteUrl(articleHref(a.slug)),
      publishedTime: a.publishedAt,
      modifiedTime: a.reviewedAt,
    },
  };
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const a = getArticle(slug);
  if (!a) notFound();

  const now = new Date();
  const areaName = AREA_META[a.area].name;
  // Need 確定後にだけ出す候補（MiniCheck が CONFIRMED のときに描画）
  const offers = selectOffers(a.area, "NOW", { now });

  return (
    <article className="container">
      <TrackView name="entry_view" props={{ page: "article", article: a.slug }} />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: a.title,
          description: a.description,
          inLanguage: "ja",
          datePublished: a.publishedAt,
          dateModified: a.reviewedAt,
          mainEntityOfPage: absoluteUrl(articleHref(a.slug)),
          author: { "@type": "Organization", name: BRAND.brand_name },
          publisher: { "@type": "Organization", name: BRAND.brand_name, url: absoluteUrl("/") },
        }}
      />
      <Breadcrumbs
        items={[
          { name: "本当に必要？", href: "/need" },
          { name: a.shortTitle, href: articleHref(a.slug) },
        ]}
      />

      <header className="article-header">
        <p className="question">検索の質問：「{a.question}」</p>
        <h1>{a.title}</h1>
        <div className="article-meta">
          <span>最終確認日：{formatDateJa(a.reviewedAt)}</span>
          <span>公開日：{formatDateJa(a.publishedAt)}</span>
          <span>執筆：{BRAND.brand_name} 編集部</span>
        </div>
      </header>

      <div className="prose">
        <section className="answer-box" aria-labelledby="answer-heading">
          <span id="answer-heading" className="answer-box__label">
            結論
          </span>
          {a.immediateAnswer.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </section>

        <h2>なぜ使われるのか</h2>
        {a.whyUsed.map((p) => (
          <p key={p}>{p}</p>
        ))}

        <h2>費用と負担の事実</h2>
        <p>{a.costIntro}</p>
        {a.costFacts.map((f) => (
          <Fact key={f.text} sources={f.sources} now={now} fallback={f.fallback}>
            {f.text}
          </Fact>
        ))}
        {a.slug === "cashless-payment" && <CashlessCalculator />}

        <h2>見落としやすいリスクと依存</h2>
        {a.risk.map((p) => (
          <p key={p}>{p}</p>
        ))}

        <h2>判断表：向く店・向かない店</h2>
        <table className="decision-table">
          <thead>
            <tr>
              <th scope="col">判断</th>
              <th scope="col">当てはまる店</th>
              <th scope="col">次の行動</th>
            </tr>
          </thead>
          <tbody>
            {a.decisionRows.map((r) => (
              <tr key={r.state}>
                <td data-label="判断">{r.label}</td>
                <td data-label="当てはまる店">{r.fit}</td>
                <td data-label="次の行動">{r.action}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h2>5問のミニチェック：あなたの店ではどうか</h2>
        <MiniCheck slug={a.slug} area={a.area} offers={offers} areaName={areaName} offerNote={a.offerNote} />

        <h2>使わないなら、何で代替するか</h2>
        {a.alternative.map((p) => (
          <p key={p}>{p}</p>
        ))}

        <h2>今日やること</h2>
        <div className="next-action">
          {a.nextAction.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>

        <h2>導入したら測るもの</h2>
        <ul className="measure-list">
          {a.measure.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>

        <section className="related" aria-labelledby="related-heading">
          <h2 id="related-heading" style={{ marginTop: 0 }}>
            次に読む
          </h2>
          <ul>
            {a.related.map((slug) => {
              const r = getArticle(slug);
              return r ? (
                <li key={slug}>
                  <Link href={articleHref(slug)}>{r.shortTitle}</Link>
                </li>
              ) : null;
            })}
            <li>
              <Link href="/check">8問｜お店に今必要なものチェック</Link>
            </li>
            <li>
              <Link href="/guide/opening-order">開業の順番</Link>
            </li>
          </ul>
        </section>
      </div>

      <div className="sticky-cta">
        <Link href={`/check?from=${a.area}`} className="btn btn--primary">
          8問で、今必要なものを確認する
        </Link>
      </div>
    </article>
  );
}
