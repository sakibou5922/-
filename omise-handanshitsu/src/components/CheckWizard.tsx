"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { track } from "@/lib/analytics";
import { entryFromParams, fromSearchParams, paramsToAnswers, resultHref } from "@/lib/decision/encode";
import { answerLabel, visibleQuestions } from "@/lib/decision/labels";
import { parseAnswers } from "@/lib/decision/parse";
import type { Area, DiagnosisAnswers, ExistingService, QuestionKey } from "@/lib/decision/types";
import { takePrefill } from "@/lib/prefill";

type Partial8 = Partial<DiagnosisAnswers>;

function isAnswered(a: Partial8, key: QuestionKey): boolean {
  const v = a[key];
  return Array.isArray(v) ? v.length > 0 : typeof v === "string";
}

export function CheckWizard() {
  const router = useRouter();

  const [answers, setAnswers] = useState<Partial8>({});
  const [entry, setEntry] = useState<Area | null>(null);
  const [prefilled, setPrefilled] = useState<Set<QuestionKey>>(new Set());
  /** step === questions.length で確認画面 */
  const [step, setStep] = useState(0);
  /** 確認画面の「直す」から来たときは、答え直したらすぐ確認画面に戻る */
  const [fromReview, setFromReview] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  // 1問目はサーバー描画のまま出し（レイアウトシフトなし・静的ページのまま）、
  // URL の回答（「回答を直す」→ 確認画面）と記事からの事前入力はマウント後に反映する
  useEffect(() => {
    const obj = fromSearchParams(new URLSearchParams(window.location.search));
    const fromUrl = paramsToAnswers(obj);
    const from = entryFromParams(obj);
    setEntry(from);
    if (fromUrl) {
      setAnswers(fromUrl);
      setStep(visibleQuestions(fromUrl).length);
    } else {
      const stored = takePrefill();
      if (stored && Object.keys(stored).length > 0) {
        const pre = stored as Partial8;
        setAnswers(pre);
        setPrefilled(new Set(Object.keys(pre) as QuestionKey[]));
        // 入力済みの質問は再質問しない：最初の未回答へ
        const vis = visibleQuestions(pre);
        const first = vis.findIndex((q) => !isAnswered(pre, q.key));
        setStep(first === -1 ? vis.length : first);
      }
    }
    track("diagnosis_start", { from: from ?? "direct" });
  }, []);

  const questions = visibleQuestions(answers);
  const total = questions.length;
  const atReview = step >= total;
  const current = questions[step];

  const [interacted, setInteracted] = useState(false);
  useEffect(() => {
    // 初回表示ではフォーカスを奪わない（ページ先頭の説明を読めるように）。操作後は見出しへ
    if (interacted) headingRef.current?.focus();
  }, [step, interacted]);

  const setSingle = (key: QuestionKey, value: string) => {
    setError(null);
    setAnswers((prev) => ({ ...prev, [key]: value }));
    track("diagnosis_answer", { question: key });
  };

  const toggleMulti = (value: ExistingService) => {
    setError(null);
    setAnswers((prev) => {
      const cur = prev.existing_services ?? [];
      let next: ExistingService[];
      if (value === "NONE") next = cur.includes("NONE") ? [] : ["NONE"];
      else if (cur.includes(value)) next = cur.filter((v) => v !== value);
      else next = [...cur.filter((v) => v !== "NONE"), value];
      return { ...prev, existing_services: next };
    });
    track("diagnosis_answer", { question: "existing_services" });
  };

  const next = () => {
    setInteracted(true);
    if (!current) return;
    if (!isAnswered(answers, current.key)) {
      setError("ひとつ選んでください。");
      return;
    }
    const rest = questions.slice(step + 1);
    // 「直す」から来て残りが全部回答済みなら確認画面へ戻る。記事から入力済みの質問は再質問しない
    const target = rest.findIndex((q) => !isAnswered(answers, q.key) || (!fromReview && !prefilled.has(q.key)));
    if (target === -1) {
      setFromReview(false);
      setStep(total);
    } else {
      setStep(step + 1 + target);
    }
  };

  const back = () => {
    setInteracted(true);
    setError(null);
    if (fromReview && !atReview) {
      setFromReview(false);
      setStep(total);
    } else {
      setStep((s) => Math.max(0, s - 1));
    }
  };

  const edit = (key: QuestionKey) => {
    setInteracted(true);
    const idx = questions.findIndex((q) => q.key === key);
    if (idx === -1) return;
    setFromReview(true);
    setStep(idx);
  };

  const submit = () => {
    try {
      const a = parseAnswers(answers);
      track("diagnosis_complete", { from: entry ?? "direct" });
      // 回答は保存しない（結果 URL にだけ含まれる）
      router.push(resultHref(a, entry));
    } catch {
      setError("未回答の質問があります。戻って答えてください。");
      const first = questions.findIndex((q) => !isAnswered(answers, q.key));
      if (first !== -1) setStep(first);
    }
  };

  if (atReview) {
    return (
      <div className="wizard">
        <div className="wizard__progress">
          <span>回答の確認</span>
          <div className="wizard__bar" aria-hidden="true">
            <span style={{ width: "100%" }} />
          </div>
          <span>
            {total} / {total}
          </span>
        </div>
        <section className="wizard__card" aria-labelledby="review-heading">
          <h2 id="review-heading" className="wizard__title" tabIndex={-1} ref={headingRef}>
            この内容で判断します
          </h2>
          <p className="wizard__help">間違いがあれば「直す」で戻れます。回答は保存されず、結果ページのURLにだけ含まれます。</p>
          <ul className="review-list">
            {questions.map((q) => (
              <li key={q.key}>
                <div>
                  <span className="q">{q.title}</span>
                  {answerLabel(q.key, answers[q.key], "未回答")}
                </div>
                <button type="button" onClick={() => edit(q.key)} aria-label={`「${q.title}」を直す`}>
                  直す
                </button>
              </li>
            ))}
          </ul>
          {error && (
            <p className="wizard__error" role="alert">
              {error}
            </p>
          )}
          <div className="wizard__nav">
            <button type="button" className="btn btn--ghost" onClick={back}>
              戻る
            </button>
            <button type="button" className="btn btn--primary" onClick={submit}>
              結果を見る
            </button>
          </div>
        </section>
      </div>
    );
  }

  if (!current) return null;
  const multi = current.type === "multi";
  const isPrefilled = prefilled.has(current.key) && isAnswered(answers, current.key);
  const progress = Math.round(((step + 1) / (total + 1)) * 100);

  return (
    <div className="wizard">
      <div className="wizard__progress" aria-live="polite">
        <span>
          質問 {step + 1} / {total}
        </span>
        <div className="wizard__bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} aria-label="進み具合">
          <span style={{ width: `${progress}%` }} />
        </div>
        {entry && <span>記事から</span>}
      </div>
      <section className="wizard__card">
        <fieldset>
          <legend>
            <h2 className="wizard__title" tabIndex={-1} ref={headingRef}>
              {current.title}
            </h2>
          </legend>
          {isPrefilled && <span className="wizard__prefilled">記事の回答から入力済み（変更できます）</span>}
          {current.help && <p className="wizard__help">{current.help}</p>}
          <ul className="option-list">
            {current.options.map((o) => {
              const id = `${current.key}-${o.value}`;
              const checked = multi
                ? (answers.existing_services ?? []).includes(o.value as ExistingService)
                : answers[current.key] === o.value;
              return (
                <li key={o.value} className={multi ? "option option--multi" : "option"}>
                  <input
                    type={multi ? "checkbox" : "radio"}
                    id={id}
                    name={current.key}
                    value={o.value}
                    checked={checked}
                    onChange={() => (multi ? toggleMulti(o.value as ExistingService) : setSingle(current.key, o.value))}
                  />
                  <label htmlFor={id}>
                    <span className="option__mark" aria-hidden="true" />
                    <span>{o.label}</span>
                    {o.hint && <span className="option__hint">{o.hint}</span>}
                  </label>
                </li>
              );
            })}
          </ul>
        </fieldset>
        {error && (
          <p className="wizard__error" role="alert">
            {error}
          </p>
        )}
        <div className="wizard__nav">
          <button type="button" className="btn btn--ghost" onClick={back} disabled={step === 0 && !fromReview}>
            戻る
          </button>
          <button type="button" className="btn btn--primary" onClick={next}>
            {step + 1 >= total ? "回答を確認する" : "次へ"}
          </button>
        </div>
      </section>
    </div>
  );
}
