import type { ReactNode } from "react";
import { checkSource } from "@/lib/evidence";
import { formatDateJa } from "@/lib/format";

interface Props {
  sources: string[];
  now: Date;
  fallback?: string;
  children: ReactNode;
}

/**
 * 根拠付きの事実。sources がすべて鮮度内なら本文＋最終確認日を出し、
 * 1つでも期限切れなら本文を出さず fallback に差し替える（A20 fail closed）。
 */
export function Fact({ sources, now, fallback, children }: Props) {
  if (sources.length === 0) return <p>{children}</p>;
  const checks = sources.map((id) => checkSource(id, now));
  const fresh = checks.every((c) => c.fresh);
  if (!fresh) {
    return (
      <p className="fact fact--stale" data-stale="true">
        {fallback ?? "この項目の数値は最終確認から日が経っているため表示していません。公式サイトで再確認してください。"}
      </p>
    );
  }
  const latest = checks.map((c) => c.verified_at ?? "").sort().at(-1) ?? "";
  return (
    <p className="fact" data-sources={sources.join(",")}>
      {children}
      <span className="fact__src">確認 {formatDateJa(latest)}</span>
    </p>
  );
}
