import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { BRAND, isPublicRelease } from "@/lib/site";

export const metadata: Metadata = {
  title: "運営者情報",
  description: `${BRAND.brand_name}の運営者情報と、お問い合わせ・相談窓口について。`,
  alternates: { canonical: "/operator" },
};

export default function OperatorPage() {
  const pending = !isPublicRelease();
  return (
    <div className="container narrow">
      <Breadcrumbs items={[{ name: "運営者情報", href: "/operator" }]} />
      <div className="page-title">
        <h1>運営者情報</h1>
      </div>
      <div className="prose section section--tight">
        {pending && (
          <div className="notice" role="note">
            公開前の検証版です。所在地・連絡先などは公開承認時に記入します（{BRAND.contact_note}）。
          </div>
        )}
        <dl className="policy-list">
          <dt>サイト名</dt>
          <dd>{BRAND.brand_name}（{BRAND.descriptor}）</dd>
          <dt>運営</dt>
          <dd>{BRAND.operator_name}</dd>
          <dt>所在地</dt>
          <dd>{pending ? "公開承認時に記入" : "—"}</dd>
          <dt>お問い合わせ</dt>
          <dd>{pending ? "公開承認時に記入" : "—"}</dd>
          <dt>サイトの方針</dt>
          <dd>
            <Link href="/about">このサイトについて</Link>／<Link href="/editorial-policy">編集方針</Link>／<Link href="/advertising-policy">広告・収益の方針</Link>／<Link href="/privacy">プライバシー</Link>
          </dd>
        </dl>

        <h2 id="consultation">仕組みづくりの相談について</h2>
        <p>
          このページからの相談は、{BRAND.operator_name}への相談です。{BRAND.brand_name}の判断結果や記事の内容が、相談の有無で変わることはありません。
        </p>
        <p>
          相談の対象は、既製サービスを3つ以上組み合わせても手作業の二重入力が残る、独自の業務の流れがある、CSVやAPIでの連携が必要、といった場合です。既製サービスで解決できる場合は、その旨をお伝えします。
        </p>
        <p>{pending ? "相談窓口の連絡先は公開承認時に記入します。" : "相談窓口の連絡先は上記のお問い合わせをご利用ください。"}</p>
      </div>
    </div>
  );
}
