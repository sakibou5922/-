/**
 * Offer 層（05_REVENUE_OFFER_RULES.md）。
 * Need 決定（engine）とは完全に分離。Need が確定した領域（NOW / NEXT / FREE_FOUNDATION）にだけ、
 * 固定の display_order で候補を出す。報酬順ランキング禁止。Affiliate なし競合の除外禁止。
 * 収益リンクは「フラグ ON・ACTIVE・APPROVED・URL あり・鮮度内・台帳に期限切れなし」のすべてを満たすときだけ（fail closed）。
 */
import offersJson from "../../config/offers.json";
import { isNeedConfirmed, type Area, type Status } from "./decision/types";
import { allFresh, anyStale, daysBetween, parseDate } from "./evidence";
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
  /** 収益プログラムの状態（OFFICIAL は常に ACTIVE） */
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

/** 候補の下に必ず添える開示文（PR / 並び順 / 公式リンク） */
export const OFFER_DISCLOSURE_NOTE =
  "並び順は固定で、紹介報酬の額では並べ替えません。収益リンクが有効なものだけ PR 表示を付け、無効なときは公式サイトへの通常リンクになります。";

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
  now: Date;
  flags?: Flags;
  /** テスト用の差し替え。既定は config/offers.json */
  offers?: Offer[];
}

/** この Offer 自身の鮮度（valid_until と根拠 id） */
export function offerFresh(o: Offer, now: Date): boolean {
  return (
    daysBetween(o.valid_until, now) <= 0 &&
    parseDate(o.verified_at).getTime() <= now.getTime() &&
    allFresh(o.evidence, now)
  );
}

/** 期限切れの material fact が 1 つでもあれば、サイト全体で収益 claim をブロック（07 / A20） */
export function monetizationBlocked(now: Date): boolean {
  return anyStale(now);
}

/** 候補として一覧に出してよいか（A12）。EXPIRED は常に非表示 */
export function isListed(o: Offer): boolean {
  if (o.status === "EXPIRED") return false;
  return o.program_type === "OFFICIAL" || o.status === "ACTIVE" || o.official_fallback;
}

/** 収益リンクを使ってよいか。1つでも欠ければ false（fail closed） */
export function monetizable(
  o: Offer,
  ctx: OfferContext,
  pre: { blocked?: boolean; fresh?: boolean } = {},
): { ok: boolean; reason: OfferState } {
  if (o.program_type === "OFFICIAL") return { ok: false, reason: "OFFICIAL_FALLBACK" };
  const flags = ctx.flags ?? FLAGS;
  if (!o.flag || !flags[o.flag]) return { ok: false, reason: "OFFER_DISABLED" };
  if (o.status !== "ACTIVE" || o.smask_enrollment !== "APPROVED" || !o.affiliate_url) {
    return { ok: false, reason: "OFFER_UNVERIFIED" };
  }
  const blocked = pre.blocked ?? monetizationBlocked(ctx.now);
  const fresh = pre.fresh ?? offerFresh(o, ctx.now);
  if (blocked || !fresh) return { ok: false, reason: "SERVICE_FACT_STALE" };
  return { ok: true, reason: "NORMAL" };
}

function toCard(o: Offer, ctx: OfferContext, blocked: boolean): OfferCardView {
  const fresh = offerFresh(o, ctx.now);
  const m = monetizable(o, ctx, { blocked, fresh });
  return {
    offer_id: o.offer_id,
    provider_name: o.provider_name,
    href: m.ok && o.affiliate_url ? o.affiliate_url : o.official_url,
    sponsored: m.ok,
    disclosure: m.ok ? o.disclosure_type : "NONE",
    facts_visible: fresh,
    verified_at: o.verified_at,
    audience_fit: o.audience_fit,
    audience_misfit: o.audience_misfit,
    fee_summary: fresh ? o.fee_summary : null,
    free_plan: fresh ? o.free_plan : null,
    initial_equipment: o.initial_equipment,
    transaction_fee: fresh ? o.transaction_fee : null,
    integration: o.integration,
    cancel_check: o.cancel_check,
    reason: m.ok ? "NORMAL" : fresh ? m.reason : "SERVICE_FACT_STALE",
  };
}

function sectionState(visible: Offer[], cards: OfferCardView[]): OfferState {
  if (cards.length === 0) return "NO_MONETIZABLE_OFFER";
  if (cards.some((c) => !c.facts_visible)) return "SERVICE_FACT_STALE";
  if (cards.some((c) => c.sponsored)) return "NORMAL";
  if (visible.every((o) => o.program_type === "OFFICIAL")) return "OFFICIAL_FALLBACK";
  return cards.some((c) => c.reason === "OFFER_DISABLED") ? "OFFER_DISABLED" : "OFFER_UNVERIFIED";
}

/**
 * 領域とステータスから表示する Offer を選ぶ。
 * Need が確定していない（LATER / NOT_PRIORITY / REVIEW_EXISTING / HIDDEN）なら空。
 */
export function selectOffers(area: Area, status: Status, ctx: OfferContext): OfferSelection {
  if (!isNeedConfirmed(status)) return { area, state: "NO_MONETIZABLE_OFFER", cards: [] };

  const visible = (ctx.offers ?? OFFERS)
    .filter((o) => o.categories.includes(area) && isListed(o))
    .sort((x, y) => x.display_order - y.display_order || x.offer_id.localeCompare(y.offer_id))
    .slice(0, MAX_OFFERS_PER_AREA);

  const blocked = monetizationBlocked(ctx.now);
  const cards = visible.map((o) => toCard(o, ctx, blocked));
  return { area, state: sectionState(visible, cards), cards };
}
