import Link from "next/link";
import { BRAND } from "@/lib/site";
import { REGISTRY_VERIFIED_AT } from "@/lib/evidence";
import { formatDateJa } from "@/lib/format";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="site-footer__grid">
          <div>
            <h2>{BRAND.brand_name}</h2>
            <p style={{ margin: 0 }}>{BRAND.core_message}</p>
          </div>
          <div>
            <h2>判断する</h2>
            <ul>
              <li>
                <Link href="/check">8問｜お店に今必要なものチェック</Link>
              </li>
              <li>
                <Link href="/need">「本当に必要？」記事一覧</Link>
              </li>
              <li>
                <Link href="/guide/opening-order">開業の順番</Link>
              </li>
            </ul>
          </div>
          <div>
            <h2>運営</h2>
            <ul>
              <li>
                <Link href="/about">このサイトについて</Link>
              </li>
              <li>
                <Link href="/editorial-policy">編集方針</Link>
              </li>
              <li>
                <Link href="/advertising-policy">広告・収益の方針</Link>
              </li>
              <li>
                <Link href="/privacy">プライバシー</Link>
              </li>
              <li>
                <Link href="/operator">運営者情報</Link>
              </li>
            </ul>
          </div>
        </div>
        <p className="site-footer__note">
          記載の料金・条件は {formatDateJa(REGISTRY_VERIFIED_AT)} 時点の公開情報をもとにしています。期限を過ぎた数値は自動的に非表示になります。最終判断は各サービスの公式情報でご確認ください。
        </p>
      </div>
    </footer>
  );
}
