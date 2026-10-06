import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { BRAND } from "@/lib/site";

export const metadata: Metadata = {
  title: "このサイトについて",
  description: `${BRAND.brand_name}は、小規模店舗・対面サービスの事業者が、予約・POS・キャッシュレス・LINE・集客媒体などを「本当に必要か／今必要か／何番目か／導入後に何を測るか」で判断できるようにするサイトです。`,
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <div className="container narrow">
      <Breadcrumbs items={[{ name: "このサイトについて", href: "/about" }]} />
      <div className="page-title">
        <h1>このサイトについて</h1>
        <p>{BRAND.core_message}</p>
      </div>
      <div className="prose section section--tight">
        <h2>目的</h2>
        <p>
          開業準備中から開業後初期の小さなお店・対面サービスの事業者が、予約、POS、キャッシュレス、LINE、外部の集客媒体、会計、Webなどについて、「本当に必要か」「今必要か」「何番目か」「導入後に何を測るか」を自分の店の条件で判断できるようにすることです。
        </p>
        <h2>考え方の順番</h2>
        <p>問題を知る → 理解する → 自分の店に当てはめる → 決める → 動く → 必要なときだけ候補を見る。この順番を崩しません。</p>
        <h2>やらないこと</h2>
        <ul>
          <li>紹介報酬の有無や額で、必要かどうかの判断を変えること。</li>
          <li>全員に相談や有料サービスを勧めること。</li>
          <li>企業や他サービスの批判を、価値の代わりにすること。</li>
          <li>診断結果を絶対の判定として見せること。結果は理由付きの「いまの優先順位」です。</li>
        </ul>
        <h2>役に立つかどうかの基準</h2>
        <ol>
          <li>読む前より良い判断ができる。</li>
          <li>必要／条件付き／まだ不要の基準が具体的である。</li>
          <li>不要なときの代替がある。</li>
          <li>必要なときの次の行動が明確である。</li>
          <li>紹介リンクをすべて消しても価値が残る。</li>
        </ol>
        <p>5つ目を満たさない記事は公開しません。</p>
        <h2>データの扱い</h2>
        <p>
          ログインも会員登録もありません。8問チェックの回答は保存せず、結果ページのURLにだけ含まれます。詳しくは<Link href="/privacy">プライバシー</Link>をご覧ください。
        </p>
        <h2>運営</h2>
        <p>
          運営者は<Link href="/operator">運営者情報</Link>に記載しています。編集と収益の方針は<Link href="/editorial-policy">編集方針</Link>と<Link href="/advertising-policy">広告・収益の方針</Link>をご覧ください。
        </p>
      </div>
    </div>
  );
}
