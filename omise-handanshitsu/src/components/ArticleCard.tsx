import Link from "next/link";
import { articleHref, type Article } from "@/lib/content/articles";

/** 記事一覧カード（トップ・記事一覧で共通） */
export function ArticleCard({ article: a }: { article: Article }) {
  return (
    <Link href={articleHref(a.slug)} className="card article-card">
      <span className="article-card__kicker">本当に必要？</span>
      <h3>{a.subject}</h3>
      <p>{a.immediateAnswer[0]}</p>
      <span className="article-card__more">判断基準を読む →</span>
    </Link>
  );
}
