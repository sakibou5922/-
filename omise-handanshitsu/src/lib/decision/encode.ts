/**
 * 回答 ↔ URL クエリの相互変換。
 * 回答は保存しない（persist_personal_answers: false）。結果 URL に回答そのものを載せることで、
 * サーバーに何も残さず、同じ URL → 同じ結果 を保証する。個人情報は含まれない。
 */
import { parseAnswers } from "./parse";
import { AREAS, type Area, type DiagnosisAnswers } from "./types";

const KEYS: Record<keyof DiagnosisAnswers, string> = {
  stage: "st",
  business_type: "bt",
  reservation_model: "rm",
  onsite_payment: "op",
  ops_complexity: "oc",
  staff_count: "sc",
  repeat_rate: "rr",
  existing_services: "ex",
  platform_dependency: "pd",
  manual_duplication: "md",
  new_customer_state: "nc",
};

/** 記事やガイドから入ってこられる領域（INTEGRATION は入口を持たない） */
const ENTRY_AREAS: readonly string[] = AREAS.filter((a) => a !== "INTEGRATION");

export function answersToParams(a: DiagnosisAnswers, entry?: Area | null): URLSearchParams {
  const p = new URLSearchParams();
  for (const [key, short] of Object.entries(KEYS) as [keyof DiagnosisAnswers, string][]) {
    const v = a[key];
    if (v !== undefined) p.set(short, Array.isArray(v) ? v.join(",") : v);
  }
  if (entry) p.set("from", entry);
  return p;
}

export function resultHref(a: DiagnosisAnswers, entry?: Area | null): string {
  return `/check/result?${answersToParams(a, entry).toString()}`;
}

/** 8問チェックの入口。回答付きなら確認画面から始まる（「回答を直す」） */
export function checkHref(entry?: Area | null, answers?: DiagnosisAnswers): string {
  const q = answers ? answersToParams(answers, entry).toString() : entry ? `from=${entry}` : "";
  return q ? `/check?${q}` : "/check";
}

export type SearchParamsLike = Record<string, string | string[] | undefined>;

export function fromSearchParams(params: URLSearchParams): SearchParamsLike {
  return Object.fromEntries(params);
}

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

/** 不正・不足なら null（DIAGNOSIS_INCOMPLETE） */
export function paramsToAnswers(params: SearchParamsLike): DiagnosisAnswers | null {
  const raw: Record<string, unknown> = {};
  for (const [key, short] of Object.entries(KEYS) as [keyof DiagnosisAnswers, string][]) {
    const v = first(params[short]);
    if (v === undefined) continue;
    raw[key] = key === "existing_services" ? v.split(",").filter(Boolean) : v;
  }
  try {
    return parseAnswers(raw);
  } catch {
    return null;
  }
}

export function entryFromParams(params: SearchParamsLike): Area | null {
  const v = first(params.from);
  return v && ENTRY_AREAS.includes(v) ? (v as Area) : null;
}
