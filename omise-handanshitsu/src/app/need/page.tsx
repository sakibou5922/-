import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ARTICLES, articleHref } from "@/lib/content/articles";

export const metadata: Metadata = {
  title: "「本当に必要？」記事一覧",
  description:
    "ホットペッパービューティー・予約システム・POSレジ・キャッシュレス決済・LINE公式アカウント。小さなお店に本当に必要かを、結論・費用の事実・判断表・ミニチェック・代替案・次の行動の順で判断する記事の一覧。",
  alternates: { canonical: "/need" },
};

export default function NeedIndexPage() {
  return (
    <div className="container">
      <Breadcrumbs items={[{ name: "本当に必要？", href: "/need" }]} />
      <div className="page-title">
        <h1>「本当に必要？」を、お店の条件で答える</h1>
        <p>
          どの記事も、サービスを勧めるためではなく、入れる・入れないを自分の店の条件で決めるためのものです。結論 → 使われる理由 → 費用の事実 → 判断表 → 5問のミニチェック → 代替案 → 次の行動、の順に進みます。
        </p>
      </div>
      <section className="section section--tight" aria-labelledby="articles-heading">
        <h2 id="articles-heading" style={{ fontSize: "1.2rem", marginBottom: 16 }}>
          5つの記事
        </h2>
        <div className="card-grid card-grid--2">
          {ARTICLES.map((a) => (
            <Link key={a.slug} href={articleHref(a.slug)} className="card article-card">
              <span className="article-card__kicker">本当に必要？</span>
              <h3>{a.shortTitle.replace(/は本当に必要？$/, "")}</h3>
              <p>{a.immediateAnswer[0]}</p>
              <span className="article-card__more">判断基準を読む →</span>
            </Link>
          ))}
        </div>
        <p style={{ marginTop: 24 }}>
          どれから読むか迷うなら、<Link href="/check">8問チェック</Link>で全体の優先順位を先に出すのが早いです。
        </p>
      </section>
    </div>
  );
}
