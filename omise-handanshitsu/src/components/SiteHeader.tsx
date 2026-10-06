import Link from "next/link";
import { BRAND } from "@/lib/site";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="container site-header__inner">
        <Link href="/" className="brand" aria-label={`${BRAND.brand_name} トップへ`}>
          <span className="brand__name">{BRAND.brand_name}</span>
          <span className="brand__desc">{BRAND.descriptor}</span>
        </Link>
        <nav className="site-nav" aria-label="主なページ">
          <Link href="/need">本当に必要？</Link>
          <Link href="/guide/opening-order">開業の順番</Link>
          <Link href="/editorial-policy">運営方針</Link>
          <Link href="/check" className="is-primary">
            8問チェック
          </Link>
        </nav>
      </div>
    </header>
  );
}
