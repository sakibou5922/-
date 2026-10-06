"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { track } from "@/lib/analytics";
import { entryFromParams, paramsToAnswers, resultHref } from "@/lib/decision/encode";
import { QUESTIONS, optionLabel, type QuestionDef } from "@/lib/decision/labels";
import { parseAnswers } from "@/lib/decision/engine";
import type { Area, DiagnosisAnswers, ExistingService, QuestionKey } from "@/lib/decision/types";

export const PREFILL_KEY = "ohs.prefill";
export const ENTRY_KEY = "ohs.entry";

type Partial8 = Partial<DiagnosisAnswers>;

function readSession<T>(key: string): T | null {
  try {
    const raw = window.sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function visibleQuestions(a: Partial8): QuestionDef[] {
  return QUESTIONS.filter((q) => !q.when || q.when(a));
}

function isAnswered(a: Partial8, key: QuestionKey): boolean {
  const v = a[key];
  return Array.isArray(v) ? v.length > 0 : typeof v === "string";
}

export function CheckWizard() {
  const router = useRouter();
  const params = useSearchParams();

  // 初期化: URL（回答を直す）> sessionStorage（記事のミニチェック）
  const initial = useMemo(() => {
    const obj: Record<string, string | string[] | undefined> = {};
    params.forEach((v, k) => {
      obj[k] = v;
    });
    const fromUrl = paramsToAnswers(obj);
    const entry = entryFromParams(obj);
    return { fromUrl, entry };
  }, [params]);

  const [answers, setAnswers] = useState<Partial8>(initial.fromUrl ?? {});
  const [prefilled, setPrefilled] = useState<Set<QuestionKey>>(new Set());
  const [entry, setEntry] = useState<Area | null>(initial.entry);
  const [step, setStep] = useState(0);
  const [review, setReview] = useState(Boolean(initial.fromUrl));
  /** 確認画面の「直す」から来たときは、答え直したらすぐ確認画面に戻る */
  const [fromReview, setFromReview] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (params.get("reset") !== null) {
      // 「最初からやり直す」: 記事からの事前入力も捨てる
      try {
        window.sessionStorage.removeItem(PREFILL_KEY);
        window.sessionStorage.removeItem(ENTRY_KEY);
      } catch {
        /* storage unavailable */
      }
    } else if (!initial.fromUrl) {
      const stored = readSession<Partial8>(PREFILL_KEY);
      const storedEntry = readSession<Area>(ENTRY_KEY);
      if (stored && Object.keys(stored).length > 0) {
        setAnswers(stored);
        setPrefilled(new Set(Object.keys(stored) as QuestionKey[]));
        // 入力済みの質問は再質問しない：最初の未回答へ
        const vis = visibleQuestions(stored);
        const first = vis.findIndex((q) => !isAnswered(stored, q.key));
        setStep(first === -1 ? vis.length : first);
      }
      if (!initial.entry && storedEntry) setEntry(storedEntry);
    }
    setReady(true);
    track("diagnosis_start", { from: initial.entry ?? "direct" });
  }, [initial, params]);

  const questions = visibleQuestions(answers);
  const total = questions.length;
  const current = questions[step];
  const atReview = review || step >= total;

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: false });
  }, [step, atReview]);

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
    if (!current) return;
    if (!isAnswered(answers, current.key)) {
      setError("ひとつ選んでください。");
      return;
    }
    const vis = visibleQuestions(answers);
    const idx = vis.findIndex((q) => q.key === current.key);
    // 「直す」から来た場合は、残りが全部回答済みなら確認画面へ戻る
    const unanswered = vis.slice(idx + 1).findIndex((q) => !isAnswered(answers, q.key));
    if (fromReview && unanswered === -1) {
      setFromReview(false);
      setReview(true);
      return;
    }
    // 記事から入力済みの質問は再質問しない
    const after = vis.slice(idx + 1).findIndex((q) => !isAnswered(answers, q.key) || !prefilled.has(q.key));
    if (after === -1) setReview(true);
    else setStep(idx + 1 + after);
  };

  const back = () => {
    setError(null);
    if (atReview && review) {
      setReview(false);
      setStep(Math.max(0, total - 1));
      return;
    }
    if (fromReview) {
      setFromReview(false);
      setReview(true);
      return;
    }
    setStep((s) => Math.max(0, s - 1));
  };

  const edit = (key: QuestionKey) => {
    const idx = visibleQuestions(answers).findIndex((q) => q.key === key);
    if (idx === -1) return;
    setFromReview(true);
    setReview(false);
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
      const vis = visibleQuestions(answers);
      const first = vis.findIndex((q) => !isAnswered(answers, q.key));
      if (first !== -1) {
        setReview(false);
        setStep(first);
      }
    }
  };

  if (!ready) {
    return (
      <div className="wizard" aria-busy="true">
        <p className="wizard__help">読み込み中…</p>
      </div>
    );
  }

  if (atReview) {
    return (
      <div className="wizard">
        <div className="wizard__progress">
          <span>回答の確認</span>
          <div className="wizard__bar" aria-hidden="true">
            <span style={{ width: "100%" }} />
          </div>
          <span>{total} / {total}</span>
        </div>
        <section className="wizard__card" aria-labelledby="review-heading">
          <h2 id="review-heading" className="wizard__title" tabIndex={-1} ref={headingRef}>
            この内容で判断します
          </h2>
          <p className="wizard__help">間違いがあれば「直す」で戻れます。回答は保存されず、結果ページのURLにだけ含まれます。</p>
          <ul className="review-list">
            {questions.map((q) => {
              const v = answers[q.key];
              const label = Array.isArray(v)
                ? v.map((x) => optionLabel(q.key, x)).join("、")
                : typeof v === "string"
                  ? optionLabel(q.key, v)
                  : "未回答";
              return (
                <li key={q.key}>
                  <div>
                    <span className="q">{q.title}</span>
                    {label}
                  </div>
                  <button type="button" onClick={() => edit(q.key)} aria-label={`「${q.title}」を直す`}>
                    直す
                  </button>
                </li>
              );
            })}
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
  const isPrefilled = prefilled.has(current.key) && isAnswered(answers, current.key);
  const progress = Math.round(((step + 1) / (total + 1)) * 100);

  return (
    <div className="wizard">
      <div className="wizard__progress" aria-live="polite">
        <span>
          質問 {step + 1} / {total}
        </span>
        <div
          className="wizard__bar"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
          aria-label="進み具合"
        >
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
              if (current.type === "multi") {
                const checked = (answers.existing_services ?? []).includes(o.value as ExistingService);
                return (
                  <li key={o.value} className="option option--multi">
                    <input
                      type="checkbox"
                      id={id}
                      name={current.key}
                      value={o.value}
                      checked={checked}
                      onChange={() => toggleMulti(o.value as ExistingService)}
                    />
                    <label htmlFor={id}>
                      <span className="option__mark" aria-hidden="true" />
                      <span>{o.label}</span>
                      {o.hint && <span className="option__hint">{o.hint}</span>}
                    </label>
                  </li>
                );
              }
              const checked = answers[current.key] === o.value;
              return (
                <li key={o.value} className="option">
                  <input
                    type="radio"
                    id={id}
                    name={current.key}
                    value={o.value}
                    checked={checked}
                    onChange={() => setSingle(current.key, o.value)}
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
          <button type="button" className="btn btn--ghost" onClick={back} disabled={step === 0}>
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
