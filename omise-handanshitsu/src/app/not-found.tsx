import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container narrow not-found">
      <h1>ページが見つかりません</h1>
      <p style={{ color: "var(--ink-2)" }}>URLが変わったか、公開前のページかもしれません。トップか、8問チェックからどうぞ。</p>
      <div className="btn-row" style={{ justifyContent: "center" }}>
        <Link href="/" className="btn btn--secondary">
          トップへ
        </Link>
        <Link href="/check" className="btn btn--primary">
          8問チェックを始める
        </Link>
      </div>
    </div>
  );
}
