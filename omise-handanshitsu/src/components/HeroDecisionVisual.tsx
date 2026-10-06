/** Hero 右側の 3段 Decision visual（HTML/CSS のみ。商品ロゴは並べない） */
export function HeroDecisionVisual() {
  return (
    <div aria-label="判断結果のイメージ：今整える・次に考える・今はいらない の3段">
      <ol className="tiers">
        <li className="tier tier--now">
          <span className="tier__mark" aria-hidden="true">
            今
          </span>
          <div>
            <p className="tier__title">今、整える</p>
            <p className="tier__items">例：Googleの店舗情報（無料）／予約の受け方を1つに決める</p>
          </div>
        </li>
        <li className="tier tier--next">
          <span className="tier__mark" aria-hidden="true">
            次
          </span>
          <div>
            <p className="tier__title">次に考える</p>
            <p className="tier__items">例：キャッシュレス（要望が続いたら）／会計の記録方法</p>
          </div>
        </li>
        <li className="tier tier--not">
          <span className="tier__mark" aria-hidden="true">
            未
          </span>
          <div>
            <p className="tier__title">今はいらない</p>
            <p className="tier__items">例：高機能POS（ひとり・在庫なし）／開業前のLINE公式</p>
          </div>
        </li>
      </ol>
      <p className="tiers__caption">※ 例はあくまで一例です。実際の結果は、あなたの8問の回答で変わります。</p>
    </div>
  );
}
