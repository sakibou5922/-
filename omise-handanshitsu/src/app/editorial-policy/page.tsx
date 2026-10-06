import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { REGISTRY_VERIFIED_AT, freshnessDays, listSources } from "@/lib/evidence";
import { formatDateJa } from "@/lib/format";
import { BRAND } from "@/lib/site";

export const metadata: Metadata = {
  title: "編集方針",
  description: `${BRAND.brand_name}の編集方針。記事の構成、料金・条件の確認と期限、固有名の数値の根拠、訂正の方法。`,
  alternates: { canonical: "/editorial-policy" },
};

export default function EditorialPolicyPage() {
  const sources = listSources();
  return (
    <div className="container narrow">
      <Breadcrumbs items={[{ name: "編集方針", href: "/editorial-policy" }]} />
      <div className="page-title">
        <h1>編集方針</h1>
        <p>「本当に必要？」に、勧めるためではなく、決めるために答えます。</p>
      </div>
      <div className="prose section section--tight">
        <h2>記事の構成</h2>
        <p>すべての記事は次の順に進みます。</p>
        <ol>
          <li>検索の質問</li>
          <li>結論（最初に答える）</li>
          <li>なぜ使われるのか</li>
          <li>費用と負担の事実（根拠付き）</li>
          <li>見落としやすいリスクと依存</li>
          <li>判断表（向く店・向かない店）</li>
          <li>5問のミニチェック</li>
          <li>あなたの店に近い判断</li>
          <li>使わないなら何で代替するか</li>
          <li>今日やること</li>
          <li>必要と判断したときだけ、候補</li>
        </ol>
        <h2>固有名の数値には根拠を置く</h2>
        <p>
          サービス名を出して料金や条件を書くときは、必ず公式情報の確認日を添えます。確認日から一定の期限（料金・報酬・契約条件は{freshnessDays("PRICING")}日、機能は{freshnessDays("FEATURE")}日、法令・広告方針は{freshnessDays("POLICY")}日）を過ぎた数値は自動的に非表示になり、「公式サイトで再確認してください」に差し替わります。
        </p>
        <h2>判断と収益は分ける</h2>
        <p>
          必要かどうかの判断は、紹介報酬の有無や額を一切参照しない仕組みで行います。詳しくは<Link href="/advertising-policy">広告・収益の方針</Link>をご覧ください。
        </p>
        <h2>業種で決めつけない</h2>
        <p>「美容室だから予約必須」のような業種による決めつけはしません。業種は弱い補正にとどめ、予約の取り方・支払い方・人数・再来の割合といった実態を優先します。</p>
        <h2>訂正</h2>
        <p>誤りが分かった場合は記事を修正し、最終確認日を更新します。訂正のご連絡は<Link href="/operator">運営者情報</Link>の窓口へお願いします。</p>

        <h2>確認している根拠（{formatDateJa(REGISTRY_VERIFIED_AT)}時点）</h2>
        <table className="decision-table">
          <thead>
            <tr>
              <th scope="col">項目</th>
              <th scope="col">確認した内容</th>
              <th scope="col">確認日</th>
            </tr>
          </thead>
          <tbody>
            {sources.map((s) => (
              <tr key={s.id}>
                <td data-label="項目">{s.label}</td>
                <td data-label="確認した内容">
                  {s.fact}（{s.domain}）
                </td>
                <td data-label="確認日">{formatDateJa(s.verified_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
