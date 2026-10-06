import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { OFFERS, monetizable } from "@/lib/offers";
import { BRAND, FLAGS } from "@/lib/site";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "広告・収益の方針",
  description: `${BRAND.brand_name}の広告・収益の方針。紹介報酬は判断に影響させない、PR表示、rel=sponsored、公式の選択肢の扱い、相談窓口の条件。`,
  alternates: { canonical: "/advertising-policy" },
};

const ENROLLMENT_LABEL: Record<string, string> = {
  NOT_EXECUTED: "未申請（リンク無効）",
  APPLIED: "申請中（リンク無効）",
  APPROVED: "承認済み",
  REJECTED: "非承認（リンク無効）",
  NOT_APPLICABLE: "—（公式リンクのみ）",
};

export default function AdvertisingPolicyPage() {
  const monetizableOffers = OFFERS.filter((o) => o.program_type !== "OFFICIAL");
  const official = OFFERS.filter((o) => o.program_type === "OFFICIAL");
  const now = new Date();
  const anyActive = monetizableOffers.some((o) => monetizable(o, { flags: FLAGS, now }).ok);
  return (
    <div className="container narrow">
      <Breadcrumbs items={[{ name: "広告・収益の方針", href: "/advertising-policy" }]} />
      <div className="page-title">
        <h1>広告・収益の方針</h1>
        <p>必要かどうかの判断と、候補の表示は、別の仕組みで動いています。</p>
      </div>
      <div className="prose section section--tight">
        <h2>収益の仕組み</h2>
        <p>
          このサイトは、必要と判断した人がサービスを申し込んだときに紹介報酬を受け取る、アフィリエイト・パートナープログラムで運営する予定です。既製サービスの組み合わせでは解決しにくい場合に限り、運営会社への相談窓口を案内することがあります。
        </p>
        <h2>判断に影響させないためのルール</h2>
        <ul>
          <li>必要かどうかの判断（8問チェック・ミニチェック）は、紹介報酬の有無や額を一切参照しません。</li>
          <li>候補の並び順は固定で、報酬の額では並べ替えません。報酬順のランキングは作りません。</li>
          <li>紹介報酬のない公式の選択肢（Airレジ・Airペイ・Googleビジネスプロフィール・LINE公式など）も、同じ条件で並べます。</li>
          <li>候補は、必要と判断された領域にだけ表示します。質問の途中や、判断の前には表示しません。</li>
          <li>無料プランで足りる人を、有料プランへ誘導しません。</li>
          <li>紹介リンクには PR 表示と rel=&quot;sponsored&quot; を付けます。未承認・期限切れ・未確認のリンクは表示せず、公式サイトへの通常リンクに切り替えます。</li>
          <li>料金・条件は確認日から一定期間を過ぎると自動的に非表示になります（<Link href="/editorial-policy">編集方針</Link>）。</li>
        </ul>

        <h2>現在のプログラム</h2>
        <p>{anyActive ? "現在、有効な紹介リンクがあります。該当する候補には PR 表示を付けています。" : "現在、有効な紹介リンクはありません。候補のリンクはすべて公式サイトへの通常リンクです。"}</p>
        <table className="decision-table">
          <thead>
            <tr>
              <th scope="col">サービス</th>
              <th scope="col">種別</th>
              <th scope="col">状態</th>
            </tr>
          </thead>
          <tbody>
            {monetizableOffers.map((o) => (
              <tr key={o.offer_id}>
                <td data-label="サービス">{o.provider_name}</td>
                <td data-label="種別">{o.program_type === "PARTNER" ? "紹介プログラム" : "アフィリエイト（ASP経由）"}</td>
                <td data-label="状態">{ENROLLMENT_LABEL[o.smask_enrollment] ?? o.smask_enrollment}</td>
              </tr>
            ))}
            {official.map((o) => (
              <tr key={o.offer_id}>
                <td data-label="サービス">{o.provider_name}</td>
                <td data-label="種別">公式リンク（報酬なし）</td>
                <td data-label="状態">{ENROLLMENT_LABEL.NOT_APPLICABLE}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h2>運営会社への相談窓口</h2>
        <p>
          既製サービスを3つ以上使っていて、手作業の二重入力が残っている場合など、既製サービスの組み合わせだけでは解決しにくいと判断されたときに限り、運営会社（{BRAND.operator_name}）への相談窓口を案内することがあります。初めて訪れた方や、判断の途中で案内することはありません。{FLAGS.smask_consultation_enabled ? "現在この案内は有効です。" : "現在この案内は無効です。"}
        </p>
      </div>
    </div>
  );
}
