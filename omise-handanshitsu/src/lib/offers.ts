/**
 * Offer 層（05_REVENUE_OFFER_RULES.md）。
 * Need 決定（engine）とは完全に分離。Need が確定した領域（NOW / NEXT / FREE_FOUNDATION）にだけ、
 * 固定の display_order で候補を出す。報酬順ランキング禁止。Affiliate なし競合の除外禁止。
 * 収益リンクは「フラグ ON・ACTIVE・APPROVED・URL あり・鮮度内」のすべてを満たすときだけ（fail closed）。
 */
import offersJson from "../../config/offers.json";
import type { Area, Status } from "./decision/types";
import { allFresh, daysBetween, parseDate, staleSources } from "./evidence";
import { FLAGS, type FlagName, type Flags } from "./site";

export type ProgramType = "AFFILIATE" | "PARTNER" | "OFFICIAL";
export type OfferStatus = "ACTIVE" | "PAUSED" | "EXPIRED" | "UNVERIFIED";
export type Enrollment = "NOT_EXECUTED" | "APPLIED" | "APPROVED" | "REJECTED" | "NOT_APPLICABLE";

export interface Offer {
  offer_id: string;
  categories: Area[];
  provider_name: string;
  program_type: ProgramType;
  flag: FlagName | null;
  affiliate_url: string | null;
  official_url: string;
  status: OfferStatus;
  smask_enrollment: Enrollment;
  /** 収益プログラムが未確認/停止中でも、公式リンクのカードとして出してよいか */
  official_fallback: boolean;
  display_order: number;
  audience_fit: string[];
  audience_misfit: string[];
  fee_summary: string;
  free_plan: string;
  initial_equipment: string;
  transaction_fee: string;
  integration: string;
  cancel_check: string;
  conversion_condition: string | null;
  verified_at: string;
  valid_until: string;
  disclosure_type: "PR" | "NONE";
  evidence: string[];
}

export const OFFERS: Offer[] = (offersJson as { offers: Offer[] }).offers;
export const MAX_OFFERS_PER_AREA: number = (offersJson as { max_offers_per_area: number }).max_offers_per_area;

/** 08_ENGINEERING_CANDIDATE.md の System states のうち Offer 層が返すもの */
export type OfferState =
  | "NORMAL"
  | "OFFICIAL_FALLBACK"
  | "OFFER_UNVERIFIED"
  | "OFFER_DISABLED"
  | "SERVICE_FACT_STALE"
  | "NO_MONETIZABLE_OFFER";

export interface OfferCardView {
  offer_id: string;
  provider_name: string;
  /** 実際に使うリンク。収益リンクが使えないときは official_url */
  href: string;
  /** rel=sponsored を付けるか（A14） */
  sponsored: boolean;
  /** PR 表示（収益リンクを使うときだけ） */
  disclosure: "PR" | "NONE";
  /** 料金などの数値 claim を見せてよいか（鮮度内） */
  facts_visible: boolean;
  verified_at: string;
  audience_fit: string[];
  audience_misfit: string[];
  fee_summary: string | null;
  free_plan: string | null;
  initial_equipment: string;
  transaction_fee: string | null;
  integration: string;
  cancel_check: string;
  /** 収益導線が閉じている理由（内部表示・テスト用。UI には出さない） */
  reason: OfferState;
}

export interface OfferSelection {
  area: Area;
  state: OfferState;
  cards: OfferCardView[];
}

export interface OfferContext {
  flags?: Flags;
  now: Date;
}

const NEED_CONFIRMED: Status[] = ["NOW", "NEXT", "FREE_FOUNDATION"];

function offerFresh(o: Offer, now: Date): boolean {
  const notExpired = daysBetween(o.valid_until, now) <= 0 && parseDate(o.verified_at).getTime() <= now.getTime();
  return notExpired && allFresh(o.evidence, now);
}

/** 収益リンクを使ってよいか。1つでも欠ければ false（fail closed） */
export function monetizable(o: Offer, ctx: OfferContext): { ok: boolean; reason: OfferState } {
  if (o.program_type === "OFFICIAL") return { ok: false, reason: "OFFICIAL_FALLBACK" };
  const flags = ctx.flags ?? FLAGS;
  if (!o.flag || !flags[o.flag]) return { ok: false, reason: "OFFER_DISABLED" };
  if (o.status !== "ACTIVE" || o.smask_enrollment !== "APPROVED" || !o.affiliate_url) {
    return { ok: false, reason: "OFFER_UNVERIFIED" };
  }
  // サイト全体で期限切れの material fact が 1 つでもあれば収益を止める（07 / A20）
  if (monetizationBlocked(ctx.now) || !offerFresh(o, ctx.now)) return { ok: false, reason: "SERVICE_FACT_STALE" };
  return { ok: true, reason: "NORMAL" };
}

function toCard(o: Offer, ctx: OfferContext): OfferCardView {
  const m = monetizable(o, ctx);
  const factsVisible = offerFresh(o, ctx.now);
  return {
    offer_id: o.offer_id,
    provider_name: o.provider_name,
    href: m.ok && o.affiliate_url ? o.affiliate_url : o.official_url,
    sponsored: m.ok,
    disclosure: m.ok ? o.disclosure_type : "NONE",
    facts_visible: factsVisible,
    verified_at: o.verified_at,
    audience_fit: o.audience_fit,
    audience_misfit: o.audience_misfit,
    fee_summary: factsVisible ? o.fee_summary : null,
    free_plan: factsVisible ? o.free_plan : null,
    initial_equipment: o.initial_equipment,
    transaction_fee: factsVisible ? o.transaction_fee : null,
    integration: o.integration,
    cancel_check: o.cancel_check,
    reason: m.ok ? "NORMAL" : factsVisible ? m.reason : "SERVICE_FACT_STALE",
  };
}

/**
 * 領域とステータスから表示する Offer を選ぶ。
 * Need が確定していない（LATER / NOT_PRIORITY / REVIEW_EXISTING / HIDDEN）なら空。
 */
export function selectOffers(
  area: Area,
  status: Status,
  ctx: OfferContext,
  offers: Offer[] = OFFERS,
): OfferSelection {
  if (!NEED_CONFIRMED.includes(status)) return { area, state: "NO_MONETIZABLE_OFFER", cards: [] };

  const candidates = offers.filter((o) => o.categories.includes(area)).sort(
    (x, y) => x.display_order - y.display_order || x.offer_id.localeCompare(y.offer_id),
  );
  // A12: EXPIRED は常に非表示。UNVERIFIED / PAUSED の収益 Offer は official_fallback のときだけ公式リンクとして出す。
  const visible = candidates
    .filter((o) => o.status !== "EXPIRED")
    .filter((o) => o.program_type === "OFFICIAL" || o.status === "ACTIVE" || o.official_fallback)
    .slice(0, MAX_OFFERS_PER_AREA);

  const cards = visible.map((o) => toCard(o, ctx));
  if (cards.length === 0) return { area, state: "NO_MONETIZABLE_OFFER", cards };
  if (cards.some((c) => !c.facts_visible)) return { area, state: "SERVICE_FACT_STALE", cards };
  if (cards.some((c) => c.sponsored)) return { area, state: "NORMAL", cards };
  const monetizableExists = visible.some((o) => o.program_type !== "OFFICIAL");
  if (!monetizableExists) return { area, state: "OFFICIAL_FALLBACK", cards };
  const reasons = cards.map((c) => c.reason);
  if (reasons.includes("OFFER_DISABLED")) return { area, state: "OFFER_DISABLED", cards };
  return { area, state: "OFFER_UNVERIFIED", cards };
}

/** 根拠台帳に期限切れの material fact が 1 つでもあれば、サイト全体で収益 claim をブロック（07 / A20） */
export function monetizationBlocked(now: Date): boolean {
  return staleSources(now).length > 0;
}
