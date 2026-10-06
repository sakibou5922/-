import { STATUS_META } from "@/lib/decision/labels";

/** Hero 右側の 3段 Decision visual（12_VISUAL_DESIGN_BRIEF: 今整える / 次に考える / 今はいらない）。例は説明用 */
const TIERS = [
  { mod: "now", mark: "今", title: STATUS_META.NOW.label, items: "例：Googleの店舗情報（無料）／予約の受け方を1つに決める" },
  { mod: "next", mark: "次", title: STATUS_META.NEXT.label, items: "例：キャッシュレス（要望が続いたら）／会計の記録方法" },
  { mod: "not", mark: "未", title: "今はいらない", items: "例：高機能POS（ひとり・在庫なし）／開業前のLINE公式" },
];

export function HeroDecisionVisual() {
  return (
    <div aria-label="判断結果のイメージ：今整える・次に考える・今はいらない の3段">
      <ol className="tiers">
        {TIERS.map((t) => (
          <li key={t.mod} className={`tier tier--${t.mod}`}>
            <span className="tier__mark" aria-hidden="true">
              {t.mark}
            </span>
            <div>
              <p className="tier__title">{t.title}</p>
              <p className="tier__items">{t.items}</p>
            </div>
          </li>
        ))}
      </ol>
      <p className="tiers__caption">※ 例はあくまで一例です。実際の結果は、あなたの8問の回答で変わります。</p>
    </div>
  );
}
