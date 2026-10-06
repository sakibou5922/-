import { describe, expect, it } from "vitest";
import { DEFAULT_RULES, decide, hashAnswers, parseAnswers, scoreArea } from "@/lib/decision/engine";
import {
  BUSINESS_TYPES,
  DecisionInputError,
  ONSITE_PAYMENTS,
  OPS_COMPLEXITIES,
  REPEAT_RATES,
  RESERVATION_MODELS,
  STAFF_COUNTS,
  STAGES,
  type DiagnosisAnswers,
} from "@/lib/decision/types";

const base: DiagnosisAnswers = {
  stage: "OPERATING",
  business_type: "BEAUTY_SALON",
  reservation_model: "APPOINTMENT_DOMINANT",
  onsite_payment: "MOST",
  ops_complexity: "SIMPLE",
  staff_count: "SMALL_2_3",
  repeat_rate: "HIGH",
  existing_services: ["NONE"],
  new_customer_state: "NEED_MORE",
};

const find = (r: ReturnType<typeof decide>, area: string) => r.decisions.find((d) => d.area === area);

describe("A01 同じ入力 + 同じルール版 → 同じ結果", () => {
  it("決定論的で、入力ハッシュも一致する", () => {
    const r1 = decide(base);
    const r2 = decide(JSON.parse(JSON.stringify(base)) as DiagnosisAnswers);
    expect(r1).toEqual(r2);
    expect(r1.input_hash).toBe(r2.input_hash);
    expect(r1.rule_version).toBe(DEFAULT_RULES.version);
  });

  it("既存サービスの順序が違ってもハッシュは同じ", () => {
    const a = { ...base, existing_services: ["LINE", "POS", "CASHLESS"] as DiagnosisAnswers["existing_services"], manual_duplication: "NO" as const };
    const b = { ...base, existing_services: ["POS", "CASHLESS", "LINE"] as DiagnosisAnswers["existing_services"], manual_duplication: "NO" as const };
    expect(hashAnswers(parseAnswers(a), "0.1")).toBe(hashAnswers(parseAnswers(b), "0.1"));
    expect(decide(a)).toEqual(decide(b));
  });
});

describe("A02 Affiliate の状態は Need 決定に影響しない", () => {
  it("エンジンはフラグや Offer を参照する引数を持たない", () => {
    expect(decide.length).toBeLessThanOrEqual(2);
    const r = decide(base);
    expect(JSON.stringify(r)).not.toMatch(/affiliate|sponsored|payout/i);
  });
});

describe("入力の検証", () => {
  it("必須が欠けると DecisionInputError", () => {
    expect(() => parseAnswers({ ...base, stage: undefined })).toThrow(DecisionInputError);
    expect(() => parseAnswers({ ...base, existing_services: [] })).toThrow(DecisionInputError);
  });
  it("条件を満たさない条件付き回答は捨てる", () => {
    const a = parseAnswers({ ...base, stage: "PRE_OPEN_0_30", new_customer_state: "NEED_MORE", platform_dependency: "HIGH" });
    expect(a.new_customer_state).toBeUndefined();
    expect(a.platform_dependency).toBeUndefined();
  });
  it("条件を満たすのに条件付き回答がなければエラー", () => {
    expect(() => parseAnswers({ ...base, new_customer_state: undefined })).toThrow(DecisionInputError);
    expect(() => parseAnswers({ ...base, existing_services: ["EXTERNAL_PLATFORM"] })).toThrow(DecisionInputError);
  });
  it("既存サービスが未知の値だけならエラー（空配列に潰さない）", () => {
    expect(() => parseAnswers({ ...base, existing_services: ["BOGUS"] })).toThrow(DecisionInputError);
  });
  it("NONE と他の値が混在したら NONE を捨てる", () => {
    const a = parseAnswers({ ...base, existing_services: ["NONE", "LINE"] });
    expect(a.existing_services).toEqual(["LINE"]);
  });
});

describe("A04 NOW 最大3 / NEXT 最大2", () => {
  it("4つ NOW 相当でも 3 つに絞り、繰り下げ理由を付ける", () => {
    const a: DiagnosisAnswers = {
      ...base,
      ops_complexity: "INVENTORY_IMPORTANT",
      staff_count: "TEAM_4_PLUS",
    };
    // RESERVATION 10 / CASHLESS 7 / POS 8 / LINE 7 → すべて NOW 相当
    expect(scoreArea("RESERVATION", a).score).toBeGreaterThanOrEqual(6);
    expect(scoreArea("CASHLESS", a).score).toBeGreaterThanOrEqual(5);
    expect(scoreArea("POS", a).score).toBeGreaterThanOrEqual(6);
    expect(scoreArea("LINE", a).score).toBeGreaterThanOrEqual(6);
    const r = decide(a);
    expect(r.groups.now).toHaveLength(3);
    expect(r.groups.next.length).toBeLessThanOrEqual(2);
    const demoted = r.decisions.filter((d) => d.demoted_from === "NOW");
    expect(demoted.length).toBeGreaterThanOrEqual(1);
    expect(demoted[0]?.reasons.at(-1)).toContain("3つまでに絞る");
  });
});

describe("A05 既導入サービスを新規導入として勧めない", () => {
  it("existing の領域は REVIEW_EXISTING になる", () => {
    const r = decide({ ...base, existing_services: ["RESERVATION", "CASHLESS", "LINE"], manual_duplication: "NO" });
    for (const area of ["RESERVATION", "CASHLESS", "LINE"]) {
      expect(find(r, area)?.status).toBe("REVIEW_EXISTING");
      expect(find(r, area)?.review_points.length).toBeGreaterThan(0);
    }
    expect(r.groups.now.map((d) => d.area)).not.toContain("RESERVATION");
  });
});

describe("Hard rules", () => {
  it("A06 飛び込み中心 → 予約システム NOT_PRIORITY", () => {
    const r = decide({ ...base, reservation_model: "WALKIN_DOMINANT" });
    expect(find(r, "RESERVATION")?.status).toBe("NOT_PRIORITY");
    expect(find(r, "RESERVATION")?.alternative).toBeTruthy();
  });
  it("A07 ひとり + シンプル → POS NOT_PRIORITY", () => {
    const r = decide({ ...base, staff_count: "SOLO", ops_complexity: "SIMPLE", business_type: "RETAIL" });
    expect(find(r, "POS")?.status).toBe("NOT_PRIORITY");
  });
  it("A08 店頭決済ほぼなし → キャッシュレス NOT_PRIORITY", () => {
    const r = decide({ ...base, onsite_payment: "LITTLE", business_type: "FOOD" });
    expect(find(r, "CASHLESS")?.status).toBe("NOT_PRIORITY");
  });
  it("再来 LOW → LINE NOT_PRIORITY", () => {
    const r = decide({ ...base, repeat_rate: "LOW" });
    expect(find(r, "LINE")?.status).toBe("NOT_PRIORITY");
  });
  it("A11 INTEGRATION は前提（既存>=3 かつ 二重入力 YES）を満たさないと HIDDEN", () => {
    const r1 = decide({ ...base, existing_services: ["LINE", "POS", "CASHLESS"], manual_duplication: "NO" });
    expect(find(r1, "INTEGRATION")).toBeUndefined();
    expect(r1.integration_candidate).toBe(false);
    const r2 = decide({ ...base, existing_services: ["LINE", "POS", "CASHLESS"], manual_duplication: "YES" });
    expect(find(r2, "INTEGRATION")?.status).toBe("NEXT");
    expect(r2.integration_candidate).toBe(true);
    const r3 = decide({ ...base, existing_services: ["LINE", "POS"] });
    expect(find(r3, "INTEGRATION")).toBeUndefined();
  });
});

describe("全組み合わせの不変条件（A04 / A09 / A10 / A05）", () => {
  it("単一回答の全組み合わせ × 既存サービス3パターン", () => {
    let count = 0;
    const existingVariants: DiagnosisAnswers["existing_services"][] = [["NONE"], ["GOOGLE_BUSINESS"], ["LINE", "POS", "CASHLESS", "ACCOUNTING"]];
    for (const stage of STAGES)
      for (const business_type of BUSINESS_TYPES)
        for (const reservation_model of RESERVATION_MODELS)
          for (const onsite_payment of ONSITE_PAYMENTS)
            for (const ops_complexity of OPS_COMPLEXITIES)
              for (const staff_count of STAFF_COUNTS)
                for (const repeat_rate of REPEAT_RATES)
                  for (const existing_services of existingVariants) {
                    const a: DiagnosisAnswers = {
                      stage,
                      business_type,
                      reservation_model,
                      onsite_payment,
                      ops_complexity,
                      staff_count,
                      repeat_rate,
                      existing_services,
                      new_customer_state: stage === "OPERATING" ? "NEED_MORE" : undefined,
                      manual_duplication: existing_services.length >= 3 ? "YES" : undefined,
                    };
                    const r = decide(a);
                    count++;
                    expect(r.groups.now.length).toBeLessThanOrEqual(3);
                    expect(r.groups.next.length).toBeLessThanOrEqual(2);
                    const line = find(r, "LINE");
                    if (stage !== "OPERATING") expect(line?.status).not.toBe("NOW"); // A09
                    expect(find(r, "EXTERNAL_PLATFORM")?.status).not.toBe("NOW"); // A10
                    for (const s of existing_services) {
                      if (s === "NONE") continue;
                      const area = s === "GOOGLE_BUSINESS" ? "GOOGLE_FOUNDATION" : s;
                      expect(find(r, area)?.status).toBe("REVIEW_EXISTING"); // A05
                    }
                    // 点数は結果に含めない。理由文は「。」で始まらない。次の行動は必ずある
                    for (const d of r.decisions) {
                      expect(d).not.toHaveProperty("score");
                      expect(d.reasons.length + d.review_points.length).toBeGreaterThan(0);
                      for (const t of d.reasons) expect(t.startsWith("。"), `${d.area}/${d.status}: ${t}`).toBe(false);
                      expect(d.next_action.length, `${d.area}/${d.status} next_action`).toBeGreaterThan(0);
                    }
                    // 無料の土台は必ず 1 つ（FREE_FOUNDATION か REVIEW_EXISTING）
                    const g = find(r, "GOOGLE_FOUNDATION");
                    expect(["FREE_FOUNDATION", "REVIEW_EXISTING"]).toContain(g?.status);
                  }
    expect(count).toBe(4 * 8 * 3 * 3 * 3 * 3 * 3 * 3);
  }, 60000);
});

describe("理由文と次の行動", () => {
  it("NOW の領域には理由・次の行動・測る指標がある", () => {
    const r = decide(base);
    for (const d of r.groups.now) {
      expect(d.reasons[0]).toMatch(/。$/);
      expect(d.next_action.length).toBeGreaterThan(0);
      expect(d.measure.length).toBeGreaterThan(0);
      expect(d.alternative).toBeNull();
    }
    for (const d of [...r.groups.not_priority, ...r.groups.later]) {
      expect(d.alternative ?? "").not.toBe("—");
    }
  });
  it("要因ゼロの LATER でも理由文が「。」から始まらない（外部媒体・開業90日以上・物販）", () => {
    const r = decide({ ...base, stage: "PRE_OPEN_90_PLUS", business_type: "RETAIL", new_customer_state: undefined });
    const d = find(r, "EXTERNAL_PLATFORM");
    expect(d?.status).toBe("LATER");
    expect(d?.reasons[0]?.startsWith("。")).toBe(false);
    expect(d?.reasons[0]).toContain("Googleビジネスプロフィール");
  });
  it("外部媒体が既存で依存 HIGH なら、依存の見直し理由が付く", () => {
    const r = decide({ ...base, existing_services: ["EXTERNAL_PLATFORM"], platform_dependency: "HIGH" });
    const d = find(r, "EXTERNAL_PLATFORM");
    expect(d?.status).toBe("REVIEW_EXISTING");
    expect(d?.reasons.join("")).toContain("媒体経由");
  });
});
