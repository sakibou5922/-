import type { Metadata } from "next";
import Link from "next/link";
import { DecisionCard } from "@/components/DecisionCard";
import { OfferSection } from "@/components/OfferCard";
import { SmaskExit } from "@/components/SmaskExit";
import { TrackView } from "@/components/TrackView";
import { decide } from "@/lib/decision/engine";
import { answersToParams, entryFromParams, paramsToAnswers, type SearchParamsLike } from "@/lib/decision/encode";
import { AREA_META, QUESTIONS, STATUS_META, optionLabel } from "@/lib/decision/labels";
import type { AreaDecision } from "@/lib/decision/types";
import { selectOffers } from "@/lib/offers";
import { BRAND, FLAGS } from "@/lib/site";

/** 結果の組み合わせページは noindex（02 / routes.json） */
export const metadata: Metadata = {
  title: "判断結果｜お店に今必要なものチェック",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<SearchParamsLike>;
}

export default async function ResultPage({ searchParams }: Props) {
  const params = await searchParams;
  const answers = paramsToAnswers(params);
  const entry = entryFromParams(params);

  if (!answers) {
    return (
      <div className="container narrow">
        <TrackView name="result_view" props={{ state: "DIAGNOSIS_INCOMPLETE" }} />
        <div className="page-title">
          <h1>回答が足りません</h1>
          <p>このURLには8問の回答が含まれていないか、形式が古いようです。もう一度、8問チェックから始めてください。所要時間は約2分です。</p>
          <Link href="/check" className="btn btn--primary">
            8問チェックを始める
          </Link>
        </div>
      </div>
    );
  }

  const result = decide(answers);
  const now = new Date();
  const g = result.groups;
  const notNow: AreaDecision[] = [...g.not_priority, ...g.later];
  const editHref = `/check?${answersToParams(answers, entry).toString()}`;
  const entryDecision = entry ? result.decisions.find((d) => d.area === entry) : undefined;

  const offerAreas = [...g.now, ...g.next, ...g.free_foundation]
    .map((d) => ({ d, sel: selectOffers(d.area, d.status, { now }) }))
    .filter((x) => x.sel.cards.length > 0);

  return (
    <div className="container">
      <TrackView
        name="result_view"
        props={{ state: "RESULT_READY", now: g.now.length, next: g.next.length, not: notNow.length, review: g.review_existing.length }}
      />
      {g.now.length > 0 && <TrackView name="result_now_item_view" props={{ areas: g.now.map((d) => d.area).join(",") }} />}
      {g.next.length > 0 && <TrackView name="result_next_item_view" props={{ areas: g.next.map((d) => d.area).join(",") }} />}
      {notNow.length > 0 && <TrackView name="result_not_priority_view" props={{ areas: notNow.map((d) => d.area).join(",") }} />}

      <div className="page-title">
        <h1>いまのお店に必要なもの、必要な順番</h1>
        <p>
          点数ではなく理由で読んでください。これは絶対の判定ではなく、あなたの回答をもとにした「いまの優先順位」です。状況が変われば結果も変わります。
        </p>
      </div>

      {entryDecision && (
        <div className="result-entry" role="note">
          <p>
            <strong>気になっていた「{AREA_META[entryDecision.area].name}」は：</strong>{" "}
            {STATUS_META[entryDecision.status].label}。下の一覧に理由があります。
          </p>
        </div>
      )}

      <section className="result-group" aria-labelledby="g-free">
        <div className="result-group__head">
          <h2 id="g-free">1. 無料で先に整える</h2>
          <p>{STATUS_META.FREE_FOUNDATION.description}</p>
        </div>
        {g.free_foundation.length > 0 ? (
          <div className="card-grid">
            {g.free_foundation.map((d) => (
              <DecisionCard key={d.area} decision={d} highlight={d.area === entry} />
            ))}
          </div>
        ) : (
          <p className="result-group__empty">無料の土台はすでに整っています。「既存サービスの見直し」で状態を確認してください。</p>
        )}
      </section>

      <section className="result-group result-group--now" aria-labelledby="g-now">
        <div className="result-group__head">
          <h2 id="g-now">2. 今、整える</h2>
          <p>{STATUS_META.NOW.description}</p>
        </div>
        {g.now.length > 0 ? (
          <div className="card-grid">
            {g.now.map((d) => (
              <DecisionCard key={d.area} decision={d} highlight={d.area === entry} />
            ))}
          </div>
        ) : (
          <p className="result-group__empty">いま急いで整えるものはありません。無料の土台と「次に考える」から進めてください。</p>
        )}
      </section>

      <section className="result-group result-group--next" aria-labelledby="g-next">
        <div className="result-group__head">
          <h2 id="g-next">3. 次に考える</h2>
          <p>{STATUS_META.NEXT.description}</p>
        </div>
        {g.next.length > 0 ? (
          <div className="card-grid">
            {g.next.map((d) => (
              <DecisionCard key={d.area} decision={d} highlight={d.area === entry} />
            ))}
          </div>
        ) : (
          <p className="result-group__empty">次に検討するものは、いまのところありません。</p>
        )}
      </section>

      <section className="result-group result-group--not" aria-labelledby="g-not">
        <div className="result-group__head">
          <h2 id="g-not">4. 今は優先しない・あとで考える</h2>
          <p>入れない判断で問題ないもの（今は優先しない）と、あとで見直せば十分なもの（あとで考える）。</p>
        </div>
        {notNow.length > 0 ? (
          <div className={`card-grid${notNow.length >= 2 ? " card-grid--2" : ""}`}>
            {notNow.map((d) => (
              <DecisionCard key={d.area} decision={d} highlight={d.area === entry} />
            ))}
          </div>
        ) : (
          <p className="result-group__empty">優先しないと判断したものはありません。</p>
        )}
      </section>

      {g.review_existing.length > 0 && (
        <section className="result-group" aria-labelledby="g-review">
          <div className="result-group__head">
            <h2 id="g-review">5. 既存サービスの見直し</h2>
            <p>{STATUS_META.REVIEW_EXISTING.description}</p>
          </div>
          <div className={`card-grid${g.review_existing.length >= 2 ? " card-grid--2" : ""}`}>
            {g.review_existing.map((d) => (
              <DecisionCard key={d.area} decision={d} highlight={d.area === entry} />
            ))}
          </div>
        </section>
      )}

      <section className="result-summary" aria-labelledby="summary-heading">
        <h2 id="summary-heading" style={{ fontSize: "1.1rem", marginBottom: 10 }}>
          あなたの回答
        </h2>
        <dl>
          {QUESTIONS.filter((q) => !q.when || q.when(answers)).map((q) => {
            const v = answers[q.key];
            const label = Array.isArray(v) ? v.map((x) => optionLabel(q.key, x)).join("、") : typeof v === "string" ? optionLabel(q.key, v) : "—";
            return (
              <div key={q.key} style={{ display: "contents" }}>
                <dt>{q.title}</dt>
                <dd>{label}</dd>
              </div>
            );
          })}
        </dl>
        <div className="btn-row" style={{ marginTop: 14 }}>
          <Link href={editHref} className="btn btn--ghost">
            回答を直す
          </Link>
          <Link href="/check?reset=1" className="btn btn--ghost">
            最初からやり直す
          </Link>
        </div>
        <p className="btn-support">
          ルール版 {result.rule_version}。同じ回答なら、いつ開いても同じ結果になります。このページは検索エンジンに登録されません。
        </p>
      </section>

      {offerAreas.length > 0 && (
        <section aria-labelledby="offers-heading" style={{ marginTop: 24 }}>
          <h2 id="offers-heading" style={{ fontSize: "1.2rem" }}>
            必要と判断した領域の候補
          </h2>
          <p className="offers__note">
            判断結果が先、候補はその下です。並び順は固定で、紹介報酬では並べ替えません。収益リンクが有効なものだけ PR 表示を付け、無効なときは公式サイトへの通常リンクになります。
          </p>
          {offerAreas.map(({ d, sel }) => (
            <OfferSection key={d.area} selection={sel} areaName={AREA_META[d.area].name} note="" />
          ))}
        </section>
      )}

      {FLAGS.smask_consultation_enabled && result.integration_candidate && <SmaskExit operatorName={BRAND.operator_name} />}
    </div>
  );
}
