/**
 * 決定論的な判断エンジン（03_DECISION_ENGINE.md）。
 *
 * - 同じ入力 + 同じルール版 → 同じ結果（A01）
 * - Affiliate の状態は一切参照しない（A02）
 * - 点数は内部値。結果には理由文だけを載せる
 */
import rulesJson from "../../../config/decision.rules.json";
import schemaJson from "../../../config/diagnosis.schema.json";
import {
  AREA_META,
  buildReasons,
  buildReviewReasons,
  existingCount,
  QUESTIONS,
} from "./labels";
import {
  AREAS,
  BUSINESS_TYPES,
  DecisionInputError,
  EXISTING_SERVICES,
  MANUAL_DUPLICATIONS,
  NEW_CUSTOMER_STATES,
  ONSITE_PAYMENTS,
  OPS_COMPLEXITIES,
  PLATFORM_DEPENDENCIES,
  REPEAT_RATES,
  RESERVATION_MODELS,
  STAFF_COUNTS,
  STAGES,
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
} from "./types";

type ScoreTable = Partial<Record<SingleQuestionKey, Record<string, number>>>;

export interface DecisionRules {
  version: string;
  max_now: number;
  max_next: number;
  thresholds: Record<ScoredArea, { NOW?: number; NEXT: number }>;
  scores: Record<ScoredArea, ScoreTable>;
  hard_rules: {
    integration_min_existing_services: number;
    line_now_requires_operating: boolean;
  };
  area_order: Area[];
}

export const DEFAULT_RULES: DecisionRules = rulesJson as unknown as DecisionRules;
export const RULE_VERSION = DEFAULT_RULES.version;
export const SCHEMA_VERSION = (schemaJson as { version: string }).version;

/* ------------------------------------------------------------------ */
/* 入力の検証                                                            */
/* ------------------------------------------------------------------ */

function oneOf<T extends string>(values: readonly T[], v: unknown): v is T {
  return typeof v === "string" && (values as readonly string[]).includes(v);
}

/**
 * 不明な形の入力を DiagnosisAnswers に正規化する。
 * 条件付き質問は、条件を満たさないときは捨てる（再質問しない・余計な値を持ち込まない）。
 */
export function parseAnswers(input: unknown): DiagnosisAnswers {
  const problems: string[] = [];
  const src = (input ?? {}) as Record<string, unknown>;

  const pick = <T extends string>(key: string, values: readonly T[]): T | undefined => {
    const v = src[key];
    if (oneOf(values, v)) return v;
    problems.push(key);
    return undefined;
  };

  const stage = pick("stage", STAGES);
  const business_type = pick("business_type", BUSINESS_TYPES);
  const reservation_model = pick("reservation_model", RESERVATION_MODELS);
  const onsite_payment = pick("onsite_payment", ONSITE_PAYMENTS);
  const ops_complexity = pick("ops_complexity", OPS_COMPLEXITIES);
  const staff_count = pick("staff_count", STAFF_COUNTS);
  const repeat_rate = pick("repeat_rate", REPEAT_RATES);

  const rawExisting = Array.isArray(src.existing_services) ? src.existing_services : [];
  const existing: ExistingService[] = [];
  for (const v of rawExisting) {
    if (oneOf(EXISTING_SERVICES, v) && !existing.includes(v)) existing.push(v);
  }
  if (existing.length === 0) problems.push("existing_services");
  // NONE と他の値が混在したら NONE を捨てる
  const existing_services: ExistingService[] =
    existing.length > 1 ? existing.filter((s) => s !== "NONE") : existing;
  // 並び順を固定して入力ハッシュを安定させる
  existing_services.sort(
    (a, b) => EXISTING_SERVICES.indexOf(a) - EXISTING_SERVICES.indexOf(b),
  );

  const partial: Partial<DiagnosisAnswers> = { stage, existing_services };

  const answers: Partial<DiagnosisAnswers> = {
    stage,
    business_type,
    reservation_model,
    onsite_payment,
    ops_complexity,
    staff_count,
    repeat_rate,
    existing_services,
  };

  for (const q of QUESTIONS) {
    if (!q.when) continue;
    const required = q.when(partial);
    if (!required) continue;
    if (q.key === "platform_dependency") {
      answers.platform_dependency = pick("platform_dependency", PLATFORM_DEPENDENCIES);
    } else if (q.key === "manual_duplication") {
      answers.manual_duplication = pick("manual_duplication", MANUAL_DUPLICATIONS);
    } else if (q.key === "new_customer_state") {
      answers.new_customer_state = pick("new_customer_state", NEW_CUSTOMER_STATES);
    }
  }

  if (problems.length > 0) throw new DecisionInputError(problems);
  return answers as DiagnosisAnswers;
}

/* ------------------------------------------------------------------ */
/* 点数（内部）                                                          */
/* ------------------------------------------------------------------ */

export function scoreArea(
  area: ScoredArea,
  a: DiagnosisAnswers,
  rules: DecisionRules = DEFAULT_RULES,
): { score: number; factors: Factor[] } {
  const table = rules.scores[area];
  const factors: Factor[] = [];
  let score = 0;
  for (const key of Object.keys(table) as SingleQuestionKey[]) {
    const value = a[key];
    if (typeof value !== "string") continue;
    const weight = table[key]?.[value];
    if (weight === undefined || weight === 0) continue;
    factors.push({ key, value, weight });
    score += weight;
  }
  return { score, factors };
}

/* ------------------------------------------------------------------ */
/* 判断                                                                 */
/* ------------------------------------------------------------------ */

const EXISTING_BY_AREA: Partial<Record<Area, ExistingService>> = {
  GOOGLE_FOUNDATION: "GOOGLE_BUSINESS",
  EXTERNAL_PLATFORM: "EXTERNAL_PLATFORM",
  LINE: "LINE",
  RESERVATION: "RESERVATION",
  CASHLESS: "CASHLESS",
  POS: "POS",
  ACCOUNTING: "ACCOUNTING",
  WEBSITE: "WEBSITE",
};

interface Draft {
  area: Area;
  status: Status;
  score: number;
  factors: Factor[];
  reasons: string[];
}

function makeDecision(d: Draft, a: DiagnosisAnswers, demotedFrom: Status | null): AreaDecision {
  const meta = AREA_META[d.area];
  const reasons = [...d.reasons];
  if (demotedFrom) {
    reasons.push(
      demotedFrom === "NOW"
        ? "条件はそろっていますが、今回は「今、整える」を3つまでに絞るため、次に回しました。"
        : "検討の価値はありますが、「次に考える」を2つまでに絞るため、あとに回しました。",
    );
  }
  const isNeeded = d.status === "NOW" || d.status === "NEXT" || d.status === "FREE_FOUNDATION";
  return {
    area: d.area,
    status: d.status,
    reasons,
    measure: isNeeded || d.status === "REVIEW_EXISTING" ? meta.measure : [],
    alternative: isNeeded ? null : meta.alternative === "—" ? null : meta.alternative,
    next_action: meta.next_action[d.status] ?? meta.next_action.LATER ?? "",
    review_points: d.status === "REVIEW_EXISTING" ? meta.review_points : [],
    demoted_from: demotedFrom,
    href: meta.href,
  };
}

function statusFromScore(
  score: number,
  th: { NOW?: number; NEXT: number },
): Extract<Status, "NOW" | "NEXT" | "LATER" | "NOT_PRIORITY"> {
  if (th.NOW !== undefined && score >= th.NOW) return "NOW";
  if (score >= th.NEXT) return "NEXT";
  if (score < 0) return "NOT_PRIORITY";
  return "LATER";
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

export function decide(input: DiagnosisAnswers | unknown, rules: DecisionRules = DEFAULT_RULES): DecisionResult {
  const a = parseAnswers(input);
  const existing = new Set<ExistingService>(a.existing_services.filter((s) => s !== "NONE"));
  const nExisting = existingCount(a);
  const drafts: Draft[] = [];

  const review = (area: Area): Draft => ({
    area,
    status: "REVIEW_EXISTING",
    score: 0,
    factors: [],
    reasons: buildReviewReasons(area, a),
  });
  const simple = (area: Area, status: Status, factors: Factor[] = [], score = 0): Draft => ({
    area,
    status,
    score,
    factors,
    reasons: buildReasons(area, status, factors),
  });
  const alreadyHas = (area: Area): boolean => {
    const s = EXISTING_BY_AREA[area];
    return s !== undefined && existing.has(s);
  };

  // GOOGLE_FOUNDATION — 常に無料の土台
  drafts.push(alreadyHas("GOOGLE_FOUNDATION") ? review("GOOGLE_FOUNDATION") : simple("GOOGLE_FOUNDATION", "FREE_FOUNDATION"));

  // RESERVATION
  if (alreadyHas("RESERVATION")) drafts.push(review("RESERVATION"));
  else {
    const { score, factors } = scoreArea("RESERVATION", a, rules);
    const status: Status =
      a.reservation_model === "WALKIN_DOMINANT" ? "NOT_PRIORITY" : statusFromScore(score, rules.thresholds.RESERVATION);
    drafts.push({ area: "RESERVATION", status, score, factors, reasons: buildReasons("RESERVATION", status, factors) });
  }

  // CASHLESS
  if (alreadyHas("CASHLESS")) drafts.push(review("CASHLESS"));
  else {
    const { score, factors } = scoreArea("CASHLESS", a, rules);
    const status: Status =
      a.onsite_payment === "LITTLE" ? "NOT_PRIORITY" : statusFromScore(score, rules.thresholds.CASHLESS);
    drafts.push({ area: "CASHLESS", status, score, factors, reasons: buildReasons("CASHLESS", status, factors) });
  }

  // POS
  if (alreadyHas("POS")) drafts.push(review("POS"));
  else {
    const { score, factors } = scoreArea("POS", a, rules);
    const status: Status =
      a.staff_count === "SOLO" && a.ops_complexity === "SIMPLE"
        ? "NOT_PRIORITY"
        : statusFromScore(score, rules.thresholds.POS);
    drafts.push({ area: "POS", status, score, factors, reasons: buildReasons("POS", status, factors) });
  }

  // ACCOUNTING — v0.1 暫定ルール（config.engineering_defaults）
  if (alreadyHas("ACCOUNTING")) drafts.push(review("ACCOUNTING"));
  else {
    const soon = a.stage === "PRE_OPEN_0_30" || a.stage === "OPERATING";
    const f: Factor[] = [{ key: "stage", value: a.stage, weight: soon ? 3 : 1 }];
    drafts.push(simple("ACCOUNTING", soon ? "NEXT" : "LATER", f, soon ? 3 : 1));
  }

  // LINE
  if (alreadyHas("LINE")) drafts.push(review("LINE"));
  else {
    const { score, factors } = scoreArea("LINE", a, rules);
    let status: Status;
    if (a.repeat_rate === "LOW") status = "NOT_PRIORITY";
    else {
      status = statusFromScore(score, rules.thresholds.LINE);
      if (status === "NOW" && rules.hard_rules.line_now_requires_operating && a.stage !== "OPERATING") status = "NEXT";
    }
    drafts.push({ area: "LINE", status, score, factors, reasons: buildReasons("LINE", status, factors) });
  }

  // EXTERNAL_PLATFORM — 新規導入は最大 NEXT
  if (alreadyHas("EXTERNAL_PLATFORM")) drafts.push(review("EXTERNAL_PLATFORM"));
  else {
    const { score, factors } = scoreArea("EXTERNAL_PLATFORM", a, rules);
    const status: Status = statusFromScore(score, { NEXT: rules.thresholds.EXTERNAL_PLATFORM.NEXT });
    drafts.push({ area: "EXTERNAL_PLATFORM", status, score, factors, reasons: buildReasons("EXTERNAL_PLATFORM", status, factors) });
  }

  // WEBSITE — v0.1 暫定ルール
  if (alreadyHas("WEBSITE")) drafts.push(review("WEBSITE"));
  else {
    const needMore =
      a.stage === "OPERATING" && a.new_customer_state === "NEED_MORE" && !existing.has("EXTERNAL_PLATFORM");
    const f: Factor[] = needMore
      ? [
          { key: "stage", value: a.stage, weight: 1 },
          { key: "new_customer_state", value: "NEED_MORE", weight: 2 },
        ]
      : [];
    drafts.push(simple("WEBSITE", needMore ? "NEXT" : "LATER", f, needMore ? 3 : 1));
  }

  // INTEGRATION — 前提を満たさなければ HIDDEN
  const integrationCandidate =
    nExisting >= rules.hard_rules.integration_min_existing_services && a.manual_duplication === "YES";
  drafts.push(
    integrationCandidate
      ? simple("INTEGRATION", "NEXT", [{ key: "manual_duplication", value: "YES", weight: 4 }], 4)
      : simple("INTEGRATION", "HIDDEN"),
  );

  // 上限: NOW 3 / NEXT 2。点数降順、同点は area_order
  const order = (area: Area) => rules.area_order.indexOf(area);
  const byPriority = (x: Draft, y: Draft) => y.score - x.score || order(x.area) - order(y.area);

  const demoted = new Map<Area, Status>();
  const nowList = drafts.filter((d) => d.status === "NOW").sort(byPriority);
  for (const d of nowList.slice(rules.max_now)) {
    d.status = "NEXT";
    demoted.set(d.area, "NOW");
  }
  const nextList = drafts.filter((d) => d.status === "NEXT").sort(byPriority);
  for (const d of nextList.slice(rules.max_next)) {
    d.status = "LATER";
    if (!demoted.has(d.area)) demoted.set(d.area, "NEXT");
  }

  const sorted = [...drafts].sort((x, y) => order(x.area) - order(y.area));
  const decisions = sorted
    .filter((d) => d.status !== "HIDDEN")
    .map((d) => makeDecision(d, a, demoted.get(d.area) ?? null));

  const rank = (list: AreaDecision[]) =>
    list.sort((x, y) => {
      const sx = drafts.find((d) => d.area === x.area)?.score ?? 0;
      const sy = drafts.find((d) => d.area === y.area)?.score ?? 0;
      return sy - sx || order(x.area) - order(y.area);
    });

  const groups: DecisionGroups = {
    free_foundation: decisions.filter((d) => d.status === "FREE_FOUNDATION"),
    now: rank(decisions.filter((d) => d.status === "NOW")),
    next: rank(decisions.filter((d) => d.status === "NEXT")),
    later: rank(decisions.filter((d) => d.status === "LATER")),
    not_priority: decisions.filter((d) => d.status === "NOT_PRIORITY"),
    review_existing: decisions.filter((d) => d.status === "REVIEW_EXISTING"),
  };

  return {
    rule_version: rules.version,
    schema_version: SCHEMA_VERSION,
    input_hash: hashAnswers(a, rules.version),
    answers: a,
    decisions,
    groups,
    integration_candidate: integrationCandidate,
  };
}

export { AREAS };
