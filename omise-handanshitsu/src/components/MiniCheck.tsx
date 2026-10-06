"use client";

import Link from "next/link";
import { useState } from "react";
import { track } from "@/lib/analytics";
import { getMiniCheck } from "@/lib/content/minichecks";
import { checkHref } from "@/lib/decision/encode";
import type { Area } from "@/lib/decision/types";
import type { OfferSelection } from "@/lib/offers";
import { writePrefill, type Prefill } from "@/lib/prefill";
import { OfferSection } from "./OfferCard";

interface Props {
  slug: string;
  area: Area;
  /** サーバーで計算済みの候補。Need が確定（CONFIRMED）したときだけ描画する */
  offers: OfferSelection;
  areaName: string;
  offerNote: string;
}

export function MiniCheck({ slug, area, offers, areaName, offerNote }: Props) {
  const mc = getMiniCheck(slug);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<string | null>(null);

  if (!mc) return null;
  const complete = mc.questions.every((q) => answers[q.id] !== undefined);

  const onChange = (id: string, value: string) => {
    if (Object.keys(answers).length === 0) track("mini_check_start", { article: slug });
    setAnswers((prev) => ({ ...prev, [id]: value }));
    setResult(null);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!complete) return;
    const state = mc.resolve(answers);
    setResult(state);
    track("mini_check_complete", { article: slug, state });
    track("article_decision_view", { article: slug, state });
    // 8問チェックへの事前入力（同じ質問を再質問しない）
    const prefill: Prefill = {};
    for (const q of mc.questions) {
      const v = answers[q.id];
      const mapped = q.prefill && v !== undefined ? q.prefill.map[v] : undefined;
      if (q.prefill && mapped !== undefined) prefill[q.prefill.key] = mapped;
    }
    writePrefill(prefill);
  };

  const state = result ? mc.states.find((s) => s.id === result) : undefined;
  const tone = state?.need === "CONFIRMED" ? "" : state?.need === "CONDITIONAL" ? " result-card--conditional" : " result-card--not";

  return (
    <div className="minicheck" id="mini-check">
      <form onSubmit={onSubmit}>
        <p className="minicheck__lead">{mc.lead}</p>
        {mc.questions.map((q, i) => (
          <fieldset key={q.id}>
            <legend>
              {i + 1}. {q.text}
            </legend>
            <div className="choice-row">
              {q.options.map((o) => {
                const id = `${slug}-${q.id}-${o.value}`;
                return (
                  <label key={o.value} className="choice" htmlFor={id}>
                    <input
                      type="radio"
                      id={id}
                      name={`${slug}-${q.id}`}
                      value={o.value}
                      checked={answers[q.id] === o.value}
                      onChange={() => onChange(q.id, o.value)}
                    />
                    <span>{o.label}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        ))}
        <button type="submit" className="btn btn--secondary" disabled={!complete}>
          判断を見る
        </button>
      </form>

      {state && (
        <div className={`result-card${tone}`} role="status" aria-live="polite" data-state={state.id}>
          <span className="result-card__label">あなたのお店に近い判断</span>
          <h3>{state.label}</h3>
          <p>{state.summary}</p>
          <p className="result-card__next">次にやること：{state.next}</p>
          <div className="btn-row">
            <Link href={checkHref(area)} className="btn btn--primary">
              8問で、ほかに今必要なものも確認する
            </Link>
          </div>
          <p className="btn-support">ここで答えた内容は引き継がれ、同じ質問は出ません。</p>
        </div>
      )}

      {state?.need === "CONFIRMED" && (
        <OfferSection selection={offers} areaName={areaName} note={offerNote} heading={`必要と判断した人向け：${areaName}の候補`} />
      )}
    </div>
  );
}
