/**
 * 回答 ↔ URL クエリの相互変換。
 * 回答は保存しない（persist_personal_answers: false）。結果 URL に回答そのものを載せることで、
 * サーバーに何も残さず、同じ URL → 同じ結果 を保証する。個人情報は含まれない。
 */
import { parseAnswers } from "./engine";
import type { DiagnosisAnswers, Area } from "./types";

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

export const ENTRY_AREAS: Area[] = [
  "RESERVATION",
  "CASHLESS",
  "POS",
  "LINE",
  "EXTERNAL_PLATFORM",
  "GOOGLE_FOUNDATION",
  "ACCOUNTING",
  "WEBSITE",
];

export function answersToParams(a: DiagnosisAnswers, entry?: Area | null): URLSearchParams {
  const p = new URLSearchParams();
  (Object.keys(KEYS) as (keyof DiagnosisAnswers)[]).forEach((key) => {
    const v = a[key];
    if (v === undefined) return;
    p.set(KEYS[key], Array.isArray(v) ? v.join(",") : v);
  });
  if (entry) p.set("from", entry);
  return p;
}

export function resultHref(a: DiagnosisAnswers, entry?: Area | null): string {
  return `/check/result?${answersToParams(a, entry).toString()}`;
}

export type SearchParamsLike = Record<string, string | string[] | undefined>;

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

/** 不正・不足なら null（DIAGNOSIS_INCOMPLETE） */
export function paramsToAnswers(params: SearchParamsLike): DiagnosisAnswers | null {
  const raw: Record<string, unknown> = {};
  (Object.keys(KEYS) as (keyof DiagnosisAnswers)[]).forEach((key) => {
    const v = first(params[KEYS[key]]);
    if (v === undefined) return;
    raw[key] = key === "existing_services" ? v.split(",").filter(Boolean) : v;
  });
  try {
    return parseAnswers(raw);
  } catch {
    return null;
  }
}

export function entryFromParams(params: SearchParamsLike): Area | null {
  const v = first(params.from);
  return v && (ENTRY_AREAS as string[]).includes(v) ? (v as Area) : null;
}
