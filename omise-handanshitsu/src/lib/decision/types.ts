/**
 * 判断エンジンの型定義（03_DECISION_ENGINE.md / config/diagnosis.schema.json）。
 * 点数は内部値であり、UI には表示しない。
 */

export const STAGES = ["PRE_OPEN_90_PLUS", "PRE_OPEN_31_90", "PRE_OPEN_0_30", "OPERATING"] as const;
export const BUSINESS_TYPES = [
  "BEAUTY_SALON",
  "HEALTH_TREATMENT",
  "FOOD",
  "RETAIL",
  "LESSON_SCHOOL",
  "FITNESS",
  "PET",
  "OTHER_FACE_TO_FACE",
] as const;
export const RESERVATION_MODELS = ["APPOINTMENT_DOMINANT", "MIXED", "WALKIN_DOMINANT"] as const;
export const ONSITE_PAYMENTS = ["MOST", "SOME", "LITTLE"] as const;
export const OPS_COMPLEXITIES = ["SIMPLE", "MULTI_LOW_INVENTORY", "INVENTORY_IMPORTANT"] as const;
export const STAFF_COUNTS = ["SOLO", "SMALL_2_3", "TEAM_4_PLUS"] as const;
export const REPEAT_RATES = ["HIGH", "MEDIUM", "LOW"] as const;
export const EXISTING_SERVICES = [
  "GOOGLE_BUSINESS",
  "EXTERNAL_PLATFORM",
  "LINE",
  "RESERVATION",
  "CASHLESS",
  "POS",
  "ACCOUNTING",
  "WEBSITE",
  "NONE",
] as const;
export const PLATFORM_DEPENDENCIES = ["HIGH", "MEDIUM", "LOW", "UNKNOWN"] as const;
export const MANUAL_DUPLICATIONS = ["YES", "NO", "UNKNOWN"] as const;
export const NEW_CUSTOMER_STATES = ["NEED_MORE", "ENOUGH", "CAPACITY_FULL", "UNKNOWN"] as const;

export type Stage = (typeof STAGES)[number];
export type BusinessType = (typeof BUSINESS_TYPES)[number];
export type ReservationModel = (typeof RESERVATION_MODELS)[number];
export type OnsitePayment = (typeof ONSITE_PAYMENTS)[number];
export type OpsComplexity = (typeof OPS_COMPLEXITIES)[number];
export type StaffCount = (typeof STAFF_COUNTS)[number];
export type RepeatRate = (typeof REPEAT_RATES)[number];
export type ExistingService = (typeof EXISTING_SERVICES)[number];
export type PlatformDependency = (typeof PLATFORM_DEPENDENCIES)[number];
export type ManualDuplication = (typeof MANUAL_DUPLICATIONS)[number];
export type NewCustomerState = (typeof NEW_CUSTOMER_STATES)[number];

export interface DiagnosisAnswers {
  stage: Stage;
  business_type: BusinessType;
  reservation_model: ReservationModel;
  onsite_payment: OnsitePayment;
  ops_complexity: OpsComplexity;
  staff_count: StaffCount;
  repeat_rate: RepeatRate;
  existing_services: ExistingService[];
  /** CQ1: EXTERNAL_PLATFORM が既存のときのみ */
  platform_dependency?: PlatformDependency;
  /** CQ2: 既存サービス（NONE 除く）が 3 つ以上のときのみ */
  manual_duplication?: ManualDuplication;
  /** CQ3: OPERATING のときのみ */
  new_customer_state?: NewCustomerState;
}

export type QuestionKey = keyof DiagnosisAnswers;
export type SingleQuestionKey = Exclude<QuestionKey, "existing_services">;

export const AREAS = [
  "GOOGLE_FOUNDATION",
  "EXTERNAL_PLATFORM",
  "RESERVATION",
  "CASHLESS",
  "POS",
  "ACCOUNTING",
  "LINE",
  "WEBSITE",
  "INTEGRATION",
] as const;
export type Area = (typeof AREAS)[number];

export const SCORED_AREAS = ["RESERVATION", "CASHLESS", "POS", "LINE", "EXTERNAL_PLATFORM"] as const;
export type ScoredArea = (typeof SCORED_AREAS)[number];

export const STATUSES = [
  "FREE_FOUNDATION",
  "NOW",
  "NEXT",
  "LATER",
  "NOT_PRIORITY",
  "REVIEW_EXISTING",
  "HIDDEN",
] as const;
export type Status = (typeof STATUSES)[number];

/** 点数に寄与した回答（内部用。理由文の生成にだけ使う） */
export interface Factor {
  key: SingleQuestionKey;
  value: string;
  weight: number;
}

export interface AreaDecision {
  area: Area;
  status: Status;
  /** ユーザーに見せる理由文（点数は含めない） */
  reasons: string[];
  /** 導入後に測る指標 */
  measure: string[];
  /** 不要・後回しのときの代替手段 */
  alternative: string | null;
  /** 次にやること */
  next_action: string;
  /** 既存サービスの見直し観点（REVIEW_EXISTING のときのみ） */
  review_points: string[];
  /** 上限（NOW 3 / NEXT 2）で繰り下がった場合の元ステータス */
  demoted_from: Status | null;
  /** 関連記事・ガイドのパス */
  href: string;
}

export interface DecisionGroups {
  free_foundation: AreaDecision[];
  now: AreaDecision[];
  next: AreaDecision[];
  later: AreaDecision[];
  not_priority: AreaDecision[];
  review_existing: AreaDecision[];
}

export interface DecisionResult {
  rule_version: string;
  schema_version: string;
  /** 正規化した回答のハッシュ。同一入力→同一結果（A01）の確認用 */
  input_hash: string;
  answers: DiagnosisAnswers;
  decisions: AreaDecision[];
  groups: DecisionGroups;
  /** 連携見直し（INTEGRATION）の前提を満たした＝SMASK Exit の候補条件 */
  integration_candidate: boolean;
}

export class DecisionInputError extends Error {
  readonly problems: string[];
  constructor(problems: string[]) {
    super(`診断の回答が不完全または不正です: ${problems.join(", ")}`);
    this.name = "DecisionInputError";
    this.problems = problems;
  }
}
