import type { OfferCardView, OfferSelection } from "@/lib/offers";
import { formatDateJa } from "@/lib/format";
import { OutboundLink } from "./OutboundLink";
import { TrackView } from "./TrackView";

export function OfferCard({ card }: { card: OfferCardView }) {
  return (
    <article className="card offer" data-offer-id={card.offer_id} data-sponsored={card.sponsored ? "true" : "false"}>
      <div className="offer__head">
        <span className="offer__name">{card.provider_name}</span>
        {card.disclosure === "PR" && (
          <span className="offer__pr" aria-label="PR（紹介報酬を受け取る場合があります）">
            PR
          </span>
        )}
      </div>
      {!card.facts_visible && (
        <p className="offer__stale">
          料金・条件の最終確認日から日が経っているため、数値は表示していません。公式サイトで最新の条件をご確認ください。
        </p>
      )}
      <dl>
        <dt>向く人</dt>
        <dd>
          <ul>
            {card.audience_fit.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </dd>
        <dt>向かない人</dt>
        <dd>
          <ul>
            {card.audience_misfit.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </dd>
        {card.fee_summary && (
          <>
            <dt>主な料金</dt>
            <dd>{card.fee_summary}</dd>
          </>
        )}
        {card.free_plan && (
          <>
            <dt>無料プラン</dt>
            <dd>{card.free_plan}</dd>
          </>
        )}
        <dt>初期機器</dt>
        <dd>{card.initial_equipment}</dd>
        {card.transaction_fee && (
          <>
            <dt>手数料</dt>
            <dd>{card.transaction_fee}</dd>
          </>
        )}
        <dt>連携</dt>
        <dd>{card.integration}</dd>
        <dt>解約・変更の確認点</dt>
        <dd>{card.cancel_check}</dd>
      </dl>
      <OutboundLink href={card.href} sponsored={card.sponsored} offerId={card.offer_id} className="btn btn--ghost">
        {card.sponsored ? "詳細を見る（PR）" : "公式サイトで確認する"}
      </OutboundLink>
      <p className="offer__meta">最終確認日：{formatDateJa(card.verified_at)}</p>
    </article>
  );
}

interface SectionProps {
  selection: OfferSelection;
  areaName: string;
  note?: string;
  heading?: string;
}

/** 決定カードより視覚的に下位に置く（A25）。Need 確定後にだけ描画する。 */
export function OfferSection({ selection, areaName, note, heading }: SectionProps) {
  if (selection.cards.length === 0) return null;
  return (
    <section className="offers" aria-labelledby={`offers-${selection.area}`}>
      <TrackView
        name="offer_impression"
        props={{ area: selection.area, state: selection.state, offers: selection.cards.map((c) => c.offer_id).join(",") }}
      />
      <h3 id={`offers-${selection.area}`} className="offers__head">
        {heading ?? `${areaName}の候補`}
      </h3>
      {note && <p className="offers__note">{note}</p>}
      <div className="card-grid card-grid--2">
        {selection.cards.map((c) => (
          <OfferCard key={c.offer_id} card={c} />
        ))}
      </div>
    </section>
  );
}
