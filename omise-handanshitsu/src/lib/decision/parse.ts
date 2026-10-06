/**
 * 回答の検証・正規化。engine と encode の両方から使う（クライアントにはこのモジュールだけが届く）。
 */
import { QUESTION_BY_KEY } from "./labels";
import {
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
  type DiagnosisAnswers,
  type ExistingService,
} from "./types";

function oneOf<T extends string>(values: readonly T[], v: unknown): v is T {
  return typeof v === "string" && (values as readonly string[]).includes(v);
}

const CONDITIONAL = {
  platform_dependency: PLATFORM_DEPENDENCIES,
  manual_duplication: MANUAL_DUPLICATIONS,
  new_customer_state: NEW_CUSTOMER_STATES,
} as const;

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

  const rawExisting = Array.isArray(src.existing_services) ? src.existing_services : [];
  const existing: ExistingService[] = [];
  for (const v of rawExisting) {
    if (oneOf(EXISTING_SERVICES, v) && !existing.includes(v)) existing.push(v);
  }
  if (existing.length === 0) problems.push("existing_services");
  // NONE と他の値が混在したら NONE を捨て、並び順を固定して入力ハッシュを安定させる
  const existing_services = (existing.length > 1 ? existing.filter((s) => s !== "NONE") : existing).sort(
    (x, y) => EXISTING_SERVICES.indexOf(x) - EXISTING_SERVICES.indexOf(y),
  );

  const answers: Partial<DiagnosisAnswers> = {
    stage: pick("stage", STAGES),
    business_type: pick("business_type", BUSINESS_TYPES),
    reservation_model: pick("reservation_model", RESERVATION_MODELS),
    onsite_payment: pick("onsite_payment", ONSITE_PAYMENTS),
    ops_complexity: pick("ops_complexity", OPS_COMPLEXITIES),
    staff_count: pick("staff_count", STAFF_COUNTS),
    repeat_rate: pick("repeat_rate", REPEAT_RATES),
    existing_services,
  };

  for (const [key, values] of Object.entries(CONDITIONAL) as [keyof typeof CONDITIONAL, readonly string[]][]) {
    if (QUESTION_BY_KEY[key].when?.(answers)) {
      answers[key] = pick(key, values) as never;
    }
  }

  if (problems.length > 0) throw new DecisionInputError(problems);
  return answers as DiagnosisAnswers;
}
