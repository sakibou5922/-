import type { Metadata } from "next";
import Link from "next/link";
import { DecisionCard } from "@/components/DecisionCard";
import { OfferSection } from "@/components/OfferCard";
import { SmaskExit } from "@/components/SmaskExit";
import { TrackView } from "@/components/TrackView";
import { decide } from "@/lib/decision/engine";
import { checkHref, entryFromParams, paramsToAnswers, type SearchParamsLike } from "@/lib/decision/encode";
import { AREA_META, STATUS_META, answerLabel, visibleQuestions } from "@/lib/decision/labels";
import { isNeedConfirmed, type Area, type AreaDecision } from "@/lib/decision/types";
import { OFFER_DISCLOSURE_NOTE, selectOffers } from "@/lib/offers";
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

interface Group {
  id: string;
  tone?: "now" | "next" | "not";
  heading: string;
  description: string;
  items: AreaDecision[];
  empty: string | null;
  /** 2 枚以上あれば 2 列（判断の重さが軽い群だけ） */
  twoCol?: boolean;
}

function ResultGroup({ group, entry }: { group: Group; entry: Area | null }) {
  if (group.items.length === 0 && group.empty === null) return null;
  const headingId = `g-${group.id}`;
  return (
    <section className={`result-group${group.tone ? ` result-group--${group.tone}` : ""}`} aria-labelledby={headingId}>
      <div className="result-group__head">
        <h2 id={headingId}>{group.heading}</h2>
        <p>{group.description}</p>
      </div>
      {group.items.length > 0 ? (
        <div className={`card-grid${group.twoCol && group.items.length >= 2 ? " card-grid--2" : ""}`}>
          {group.items.map((d) => (
            <DecisionCard key={d.area} decision={d} highlight={d.area === entry} />
          ))}
        </div>
      ) : (
        <p className="result-group__empty">{group.empty}</p>
      )}
    </section>
  );
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
  const notNow = [...g.not_priority, ...g.later];
  const entryDecision = entry ? result.decisions.find((d) => d.area === entry) : undefined;

  const groups: Group[] = [
    { id: "free", heading: `1. ${STATUS_META.FREE_FOUNDATION.label}`, description: STATUS_META.FREE_FOUNDATION.description, items: g.free_foundation, empty: "無料の土台はすでに整っています。「既存サービスの見直し」で状態を確認してください。" },
    { id: "now", tone: "now", heading: `2. ${STATUS_META.NOW.label}`, description: STATUS_META.NOW.description, items: g.now, empty: "いま急いで整えるものはありません。無料の土台と「次に考える」から進めてください。" },
    { id: "next", tone: "next", heading: `3. ${STATUS_META.NEXT.label}`, description: STATUS_META.NEXT.description, items: g.next, empty: "次に検討するものは、いまのところありません。" },
    { id: "not", tone: "not", heading: `4. ${STATUS_META.NOT_PRIORITY.label}・${STATUS_META.LATER.label}`, description: `入れない判断で問題ないもの（${STATUS_META.NOT_PRIORITY.label}）と、あとで見直せば十分なもの（${STATUS_META.LATER.label}）。`, items: notNow, empty: "優先しないと判断したものはありません。", twoCol: true },
    { id: "review", heading: `5. ${STATUS_META.REVIEW_EXISTING.label}`, description: STATUS_META.REVIEW_EXISTING.description, items: g.review_existing, empty: null, twoCol: true },
  ];

  const offerAreas = result.decisions
    .filter((d) => isNeedConfirmed(d.status))
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
            <strong>気になっていた「{AREA_META[entryDecision.area].name}」は：</strong> {STATUS_META[entryDecision.status].label}
            。下の一覧に理由があります。
          </p>
        </div>
      )}

      {groups.map((group) => (
        <ResultGroup key={group.id} group={group} entry={entry} />
      ))}

      <section className="result-summary" aria-labelledby="summary-heading">
        <h2 id="summary-heading" style={{ fontSize: "1.1rem", marginBottom: 10 }}>
          あなたの回答
        </h2>
        <dl>
          {visibleQuestions(answers).map((q) => (
            <div key={q.key} style={{ display: "contents" }}>
              <dt>{q.title}</dt>
              <dd>{answerLabel(q.key, answers[q.key])}</dd>
            </div>
          ))}
        </dl>
        <div className="btn-row" style={{ marginTop: 14 }}>
          <Link href={checkHref(entry, answers)} className="btn btn--ghost">
            回答を直す
          </Link>
          <Link href={checkHref()} className="btn btn--ghost">
            最初からやり直す
          </Link>
        </div>
        <p className="btn-support">ルール版 {result.rule_version}。同じ回答なら、いつ開いても同じ結果になります。このページは検索エンジンに登録されません。</p>
      </section>

      {offerAreas.length > 0 && (
        <section aria-labelledby="offers-heading" style={{ marginTop: 24 }}>
          <h2 id="offers-heading" style={{ fontSize: "1.2rem" }}>
            必要と判断した領域の候補
          </h2>
          <p className="offers__note">判断結果が先、候補はその下です。{OFFER_DISCLOSURE_NOTE}</p>
          {offerAreas.map(({ d, sel }) => (
            <OfferSection key={d.area} selection={sel} areaName={AREA_META[d.area].name} />
          ))}
        </section>
      )}

      {FLAGS.smask_consultation_enabled && result.integration_candidate && <SmaskExit operatorName={BRAND.operator_name} />}
    </div>
  );
}
