import { describe, expect, it } from "vitest";
import { answersToParams, entryFromParams, paramsToAnswers, resultHref } from "@/lib/decision/encode";
import { decide } from "@/lib/decision/engine";
import type { DiagnosisAnswers } from "@/lib/decision/types";

const a: DiagnosisAnswers = {
  stage: "OPERATING",
  business_type: "FOOD",
  reservation_model: "MIXED",
  onsite_payment: "MOST",
  ops_complexity: "MULTI_LOW_INVENTORY",
  staff_count: "SMALL_2_3",
  repeat_rate: "MEDIUM",
  existing_services: ["GOOGLE_BUSINESS", "CASHLESS", "POS"],
  manual_duplication: "YES",
  new_customer_state: "ENOUGH",
};

function toObj(p: URLSearchParams): Record<string, string> {
  const o: Record<string, string> = {};
  p.forEach((v, k) => {
    o[k] = v;
  });
  return o;
}

describe("回答 ↔ URL", () => {
  it("往復で同じ回答・同じ結果になる（A22: 個人情報なし）", () => {
    const p = answersToParams(a, "POS");
    const back = paramsToAnswers(toObj(p));
    expect(back).toEqual(a);
    expect(decide(back!)).toEqual(decide(a));
    expect(entryFromParams(toObj(p))).toBe("POS");
    expect(resultHref(a)).toMatch(/^\/check\/result\?/);
    expect(p.toString()).not.toMatch(/name|mail|tel|phone/);
  });
  it("壊れた URL は null（DIAGNOSIS_INCOMPLETE）", () => {
    expect(paramsToAnswers({})).toBeNull();
    expect(paramsToAnswers({ st: "OPERATING" })).toBeNull();
    expect(paramsToAnswers({ ...toObj(answersToParams(a)), st: "HACK" })).toBeNull();
    expect(entryFromParams({ from: "../../etc" })).toBeNull();
  });
  it("配列で来ても先頭を使う", () => {
    const o = toObj(answersToParams(a));
    expect(paramsToAnswers({ ...o, st: ["OPERATING", "FOOD"] })).toEqual(a);
  });
});
