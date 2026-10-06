/**
 * 決定論的な判断エンジン（03_DECISION_ENGINE.md）。
 *
 * - 同じ入力 + 同じルール版 → 同じ結果（A01）
 * - Affiliate の状態は一切参照しない（A02）
 * - 点数・閾値・ハードルールは config/decision.rules.json（単一データ層）
 * - 点数は内部値。結果には理由文だけを載せる
 */
import rulesJson from "../../../config/decision.rules.json";
import schemaJson from "../../../config/diagnosis.schema.json";
import { AREA_META, buildReasons, buildReviewReasons, existingCount } from "./labels";
import { parseAnswers } from "./parse";
import {
  isNeedConfirmed,
  type Area,
  type AreaDecision,
  type DecisionGroups,
  type DecisionResult,
  type DiagnosisAnswers,
  type ExistingService,
  type Factor,
  type ScoredArea,
  type SingleQuestionKey,
  type Status,
  type VisibleStatus,
} from "./types";

export { parseAnswers } from "./parse";

type ScoreTable = Partial<Record<SingleQuestionKey, Record<string, number>>>;

interface Condition {
  key: SingleQuestionKey;
  value: string;
}

export interface DecisionRules {
  version: string;
  max_now: number;
  max_next: number;
  areas: { id: Area; existing: ExistingService | null }[];
  thresholds: Record<ScoredArea, { NOW?: number; NEXT: number }>;
  scores: Record<ScoredArea, ScoreTable>;
  hard_rules: {
    not_priority_when: { area: ScoredArea; all: Condition[] }[];
    caps: { area: ScoredArea; max_status: Status; unless?: Condition; when_existing?: ExistingService }[];
    integration_min_existing_services: number;
  };
}

export const DEFAULT_RULES: DecisionRules = rulesJson as unknown as DecisionRules;
export const RULE_VERSION = DEFAULT_RULES.version;
export const SCHEMA_VERSION = (schemaJson as { version: string }).version;

/** 領域 → それに対応する「すでに使っているもの」（テストでも参照） */
export const EXISTING_BY_AREA: Partial<Record<Area, ExistingService>> = Object.fromEntries(
  DEFAULT_RULES.areas.filter((x) => x.existing).map((x) => [x.id, x.existing]),
);

/* ------------------------------------------------------------------ */
/* 点数（内部）                                                          */
/* ------------------------------------------------------------------ */

export function scoreArea(
  area: ScoredArea,
  a: DiagnosisAnswers,
  rules: DecisionRules = DEFAULT_RULES,
): { score: number; factors: Factor[] } {
  const factors: Factor[] = [];
  for (const [key, table] of Object.entries(rules.scores[area]) as [SingleQuestionKey, Record<string, number>][]) {
    const value = a[key];
    const weight = typeof value === "string" ? table[value] : undefined;
    if (weight) factors.push({ key, value: value as string, weight });
  }
  return { score: sum(factors), factors };
}

const sum = (factors: Factor[]) => factors.reduce((s, f) => s + f.weight, 0);

const STATUS_RANK: Record<Status, number> = {
  NOW: 4,
  NEXT: 3,
  LATER: 2,
  NOT_PRIORITY: 1,
  FREE_FOUNDATION: 0,
  REVIEW_EXISTING: 0,
  HIDDEN: 0,
};

function statusFromScore(score: number, th: { NOW?: number; NEXT: number }): Status {
  if (th.NOW !== undefined && score >= th.NOW) return "NOW";
  if (score >= th.NEXT) return "NEXT";
  return score < 0 ? "NOT_PRIORITY" : "LATER";
}

/** FNV-1a 32bit。暗号用途ではなく、同一入力の確認用 */
export function hashAnswers(a: DiagnosisAnswers, ruleVersion: string): string {
  const canonical = JSON.stringify({
    v: ruleVersion,
    stage: a.stage,
    business_type: a.business_type,
    reservation_model: a.reservation_model,
    onsite_payment: a.onsite_payment,
    ops_complexity: a.ops_complexity,
    staff_count: a.staff_count,
    repeat_rate: a.repeat_rate,
    existing_services: [...a.existing_services].sort(),
    platform_dependency: a.platform_dependency ?? null,
    manual_duplication: a.manual_duplication ?? null,
    new_customer_state: a.new_customer_state ?? null,
  });
  let h = 0x811c9dc5;
  for (let i = 0; i < canonical.length; i++) {
    h ^= canonical.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

/* ------------------------------------------------------------------ */
/* 判断                                                                 */
/* ------------------------------------------------------------------ */

interface Draft {
  area: Area;
  status: Status;
  score: number;
  factors: Factor[];
  reasons: string[];
}

function makeDecision(d: Draft, demotedFrom: Status | null, rules: DecisionRules): AreaDecision {
  const meta = AREA_META[d.area];
  const status = d.status as VisibleStatus;
  const reasons = [...d.reasons];
  if (demotedFrom === "NOW") {
    reasons.push(`条件はそろっていますが、今回は「今、整える」を${rules.max_now}つまでに絞るため、次に回しました。`);
  } else if (demotedFrom === "NEXT") {
    reasons.push(`検討の価値はありますが、「次に考える」を${rules.max_next}つまでに絞るため、あとに回しました。`);
  }
  const needed = isNeedConfirmed(status);
  return {
    area: d.area,
    status,
    reasons,
    measure: needed || status === "REVIEW_EXISTING" ? meta.measure : [],
    alternative: needed ? null : meta.alternative,
    next_action: meta.next_action[status] ?? meta.next_action.LATER ?? "",
    review_points: status === "REVIEW_EXISTING" ? meta.review_points : [],
    demoted_from: demotedFrom,
    href: meta.href,
  };
}

export function decide(input: DiagnosisAnswers | unknown, rules: DecisionRules = DEFAULT_RULES): DecisionResult {
  const a = parseAnswers(input);
  const existing = new Set<ExistingService>(a.existing_services.filter((s) => s !== "NONE"));
  const matches = (c: Condition) => a[c.key] === c.value;

  const draft = (area: Area, status: Status, factors: Factor[] = []): Draft => ({
    area,
    status,
    score: sum(factors),
    factors,
    reasons: status === "REVIEW_EXISTING" ? buildReviewReasons(area, a) : buildReasons(area, status, factors),
  });

  const integrationCandidate =
    existingCount(a) >= rules.hard_rules.integration_min_existing_services && a.manual_duplication === "YES";

  const drafts: Draft[] = rules.areas.map(({ id: area, existing: service }) => {
    // 既導入は常に見直し。新規導入としては勧めない（A05）
    if (service && existing.has(service)) return draft(area, "REVIEW_EXISTING");
    if (area === "GOOGLE_FOUNDATION") return draft(area, "FREE_FOUNDATION");
    if (area === "INTEGRATION") {
      return integrationCandidate
        ? draft(area, "NEXT", [{ key: "manual_duplication", value: "YES", weight: 4 }])
        : draft(area, "HIDDEN");
    }
    const { score, factors } = scoreArea(area, a, rules);
    let status = rules.hard_rules.not_priority_when.some((r) => r.area === area && r.all.every(matches))
      ? "NOT_PRIORITY"
      : statusFromScore(score, rules.thresholds[area]);
    for (const cap of rules.hard_rules.caps) {
      if (cap.area !== area) continue;
      if (cap.unless && matches(cap.unless)) continue;
      if (cap.when_existing && !existing.has(cap.when_existing)) continue;
      if (STATUS_RANK[status] > STATUS_RANK[cap.max_status]) status = cap.max_status;
    }
    return draft(area, status, factors);
  });

  // 上限: NOW 3 / NEXT 2。点数降順、同点は areas の並び
  const order = new Map(rules.areas.map((x, i) => [x.id, i]));
  const byArea = (x: Draft, y: Draft) => (order.get(x.area) ?? 0) - (order.get(y.area) ?? 0);
  const byPriority = (x: Draft, y: Draft) => y.score - x.score || byArea(x, y);

  const demoted = new Map<Area, Status>();
  for (const d of drafts.filter((d) => d.status === "NOW").sort(byPriority).slice(rules.max_now)) {
    d.status = "NEXT";
    demoted.set(d.area, "NOW");
  }
  for (const d of drafts.filter((d) => d.status === "NEXT").sort(byPriority).slice(rules.max_next)) {
    d.status = "LATER";
    if (!demoted.has(d.area)) demoted.set(d.area, "NEXT");
  }

  const visible = drafts.filter((d) => d.status !== "HIDDEN");
  const decisionOf = new Map(visible.map((d) => [d.area, makeDecision(d, demoted.get(d.area) ?? null, rules)]));
  const pick = (status: Status, sorter: typeof byPriority) =>
    visible
      .filter((d) => d.status === status)
      .sort(sorter)
      .map((d) => decisionOf.get(d.area) as AreaDecision);

  const groups: DecisionGroups = {
    free_foundation: pick("FREE_FOUNDATION", byArea),
    now: pick("NOW", byPriority),
    next: pick("NEXT", byPriority),
    later: pick("LATER", byPriority),
    not_priority: pick("NOT_PRIORITY", byArea),
    review_existing: pick("REVIEW_EXISTING", byArea),
  };

  return {
    rule_version: rules.version,
    schema_version: SCHEMA_VERSION,
    input_hash: hashAnswers(a, rules.version),
    answers: a,
    decisions: [...visible].sort(byArea).map((d) => decisionOf.get(d.area) as AreaDecision),
    groups,
    integration_candidate: integrationCandidate,
  };
}
