"use client";

import { useId, useState } from "react";

/** monthly_cashless_sales × fee_rate + fixed fee（04_CONTENT_MATRIX.md） */
export function CashlessCalculator() {
  const id = useId();
  const [sales, setSales] = useState("");
  const [rate, setRate] = useState("");
  const [fixed, setFixed] = useState("0");

  const s = Number(sales.replace(/[^\d.]/g, ""));
  const r = Number(rate.replace(/[^\d.]/g, ""));
  const f = Number(fixed.replace(/[^\d.]/g, ""));
  const valid = s > 0 && r >= 0 && f >= 0 && Number.isFinite(s) && Number.isFinite(r) && Number.isFinite(f);
  const cost = valid ? Math.round((s * r) / 100 + f) : 0;
  const share = valid && s > 0 ? ((cost / s) * 100).toFixed(2) : "0";

  return (
    <div className="calc" aria-labelledby={`${id}-title`}>
      <h3 id={`${id}-title`} style={{ marginBottom: 12 }}>
        月の実コスト計算機
      </h3>
      <div className="calc__grid">
        <div>
          <label htmlFor={`${id}-sales`}>月のキャッシュレス売上（円）</label>
          <input id={`${id}-sales`} inputMode="numeric" placeholder="例：300000" value={sales} onChange={(e) => setSales(e.target.value)} />
        </div>
        <div>
          <label htmlFor={`${id}-rate`}>決済手数料率（%）</label>
          <input id={`${id}-rate`} inputMode="decimal" placeholder="自店に適用される料率" value={rate} onChange={(e) => setRate(e.target.value)} />
        </div>
        <div>
          <label htmlFor={`${id}-fixed`}>月額固定費（円）</label>
          <input id={`${id}-fixed`} inputMode="numeric" value={fixed} onChange={(e) => setFixed(e.target.value)} />
        </div>
      </div>
      <div className="calc__out" aria-live="polite">
        {valid ? (
          <p style={{ margin: 0 }}>
            月のコストは約 <strong>{cost.toLocaleString("ja-JP")}円</strong>（キャッシュレス売上の {share}%）
          </p>
        ) : (
          <p style={{ margin: 0, color: "var(--muted)" }}>売上と料率を入れると、月のコストが出ます。</p>
        )}
        <p className="calc__note">料率は提供会社・ブランド・審査で異なります。必ず自店に適用される最新の条件を入れてください。計算結果は保存されません。</p>
      </div>
    </div>
  );
}
