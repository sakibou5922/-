import { describe, expect, it } from "vitest";
import { MAX_OFFERS_PER_AREA, OFFERS, monetizable, monetizationBlocked, selectOffers, type Offer } from "@/lib/offers";
import { checkSource, listSources, staleSources } from "@/lib/evidence";
import { loadFlags, type Flags } from "@/lib/site";

const NOW = new Date("2026-10-10T00:00:00Z");
const allOff: Flags = loadFlags({});
const allOn: Flags = {
  affiliate_square_enabled: true,
  partner_freee_reservation_enabled: true,
  affiliate_freee_accounting_enabled: true,
  smask_consultation_enabled: true,
  public_release_enabled: true,
};

const approved = (o: Offer): Offer => ({
  ...o,
  status: "ACTIVE",
  smask_enrollment: "APPROVED",
  affiliate_url: "https://example.invalid/aff/" + o.offer_id,
});

describe("既定値は fail closed", () => {
  it("config/features.json のフラグはすべて false", () => {
    expect(Object.values(allOff).every((v) => v === false)).toBe(true);
  });
  it("収益 Offer は未申請・UNVERIFIED・URL なしで、収益リンクは使えない", () => {
    for (const o of OFFERS.filter((o) => o.program_type !== "OFFICIAL")) {
      expect(o.smask_enrollment).toBe("NOT_EXECUTED");
      expect(o.affiliate_url).toBeNull();
      expect(monetizable(o, { flags: allOff, now: NOW }).ok).toBe(false);
      expect(monetizable(o, { flags: allOn, now: NOW }).ok).toBe(false);
    }
  });
});

describe("A13 公式フォールバック", () => {
  it("フラグ OFF でも候補は公式リンクで出る（sponsored なし・PR なし）", () => {
    const sel = selectOffers("CASHLESS", "NOW", { flags: allOff, now: NOW });
    expect(sel.cards.length).toBeGreaterThan(0);
    expect(sel.cards.length).toBeLessThanOrEqual(MAX_OFFERS_PER_AREA);
    for (const c of sel.cards) {
      expect(c.sponsored).toBe(false);
      expect(c.disclosure).toBe("NONE");
      expect(c.href).toMatch(/^https:\/\//);
      expect(c.href).not.toContain("example.invalid");
    }
    expect(["OFFER_DISABLED", "OFFICIAL_FALLBACK"]).toContain(sel.state);
    // Affiliate なし競合（Airペイ）を除外しない
    expect(sel.cards.map((c) => c.offer_id)).toContain("airpay");
  });
  it("並び順は display_order 固定（報酬順ではない）", () => {
    const sel = selectOffers("POS", "NOW", { flags: allOff, now: NOW });
    const orders = sel.cards.map((c) => OFFERS.find((o) => o.offer_id === c.offer_id)?.display_order ?? 0);
    expect([...orders].sort((a, b) => a - b)).toEqual(orders);
  });
});

describe("A14 収益リンクが有効なときだけ sponsored", () => {
  it("フラグ ON + ACTIVE + APPROVED + URL + 鮮度内 → sponsored / PR", () => {
    const offers = OFFERS.map((o) => (o.offer_id === "freee_reservation" ? approved(o) : o));
    const sel = selectOffers("RESERVATION", "NOW", { flags: allOn, now: NOW, offers });
    const card = sel.cards.find((c) => c.offer_id === "freee_reservation");
    expect(card?.sponsored).toBe(true);
    expect(card?.disclosure).toBe("PR");
    expect(card?.href).toContain("example.invalid/aff/");
    expect(sel.state).toBe("NORMAL");
  });
  it("どれか 1 つでも欠ければ公式リンクに落ちる", () => {
    const o = approved(OFFERS.find((x) => x.offer_id === "square") as Offer);
    expect(monetizable({ ...o, status: "PAUSED" }, { flags: allOn, now: NOW }).ok).toBe(false);
    expect(monetizable({ ...o, smask_enrollment: "APPLIED" }, { flags: allOn, now: NOW }).ok).toBe(false);
    expect(monetizable({ ...o, affiliate_url: null }, { flags: allOn, now: NOW }).ok).toBe(false);
    expect(monetizable(o, { flags: { ...allOn, affiliate_square_enabled: false }, now: NOW }).ok).toBe(false);
    expect(monetizable(o, { flags: allOn, now: NOW }).ok).toBe(true);
  });
});

describe("A12 未確認・期限切れ Offer の非表示", () => {
  it("EXPIRED / PAUSED の収益 Offer は候補に出ない", () => {
    const offers = OFFERS.map((o) => (o.offer_id === "square" ? { ...o, status: "EXPIRED" as const } : o));
    const sel = selectOffers("CASHLESS", "NOW", { flags: allOff, now: NOW, offers });
    expect(sel.cards.map((c) => c.offer_id)).not.toContain("square");
    expect(sel.cards.map((c) => c.offer_id)).toContain("airpay");
  });
});

describe("A12 UNVERIFIED は official_fallback のときだけ公式リンクで出る", () => {
  it("freee会計（official_fallback=false）は会計領域に出ない", () => {
    const sel = selectOffers("ACCOUNTING", "NEXT", { flags: allOff, now: NOW });
    expect(sel.cards.map((c) => c.offer_id)).not.toContain("freee_accounting");
  });
  it("freee予約（official_fallback=true）は公式リンクで出るが、承認されるまで sponsored にならない", () => {
    const sel = selectOffers("RESERVATION", "NEXT", { flags: allOn, now: NOW });
    const c = sel.cards.find((x) => x.offer_id === "freee_reservation");
    expect(c?.href).toBe("https://www.freee.co.jp/reservation/");
    expect(c?.sponsored).toBe(false);
  });
  it("PAUSED でも official_fallback=false なら出ない", () => {
    const offers = OFFERS.map((o) => (o.offer_id === "square" ? { ...o, status: "PAUSED" as const, official_fallback: false } : o));
    const sel = selectOffers("POS", "NOW", { flags: allOff, now: NOW, offers });
    expect(sel.cards.map((c) => c.offer_id)).not.toContain("square");
    expect(sel.cards.map((c) => c.offer_id)).toContain("airregi");
  });
});

describe("config/offer.schema.json との整合", () => {
  it("すべての Offer がスキーマのフィールドと列挙値を満たす", async () => {
    const schema = (await import("../config/offer.schema.json")).default as {
      fields: string[];
      program_type: string[];
      status: string[];
      enrollment: string[];
      disclosure_type: string[];
      max_offers: number;
    };
    expect(MAX_OFFERS_PER_AREA).toBe(schema.max_offers);
    for (const o of OFFERS) {
      for (const f of schema.fields) expect(o, `${o.offer_id} lacks ${f}`).toHaveProperty(f);
      expect(schema.program_type).toContain(o.program_type);
      expect(schema.status).toContain(o.status);
      expect(schema.enrollment).toContain(o.smask_enrollment);
      expect(schema.disclosure_type).toContain(o.disclosure_type);
      expect(o.categories.length).toBeGreaterThan(0);
      expect(o.official_url).toMatch(/^https:\/\//);
    }
  });
});

describe("A20 鮮度切れは数値 claim を隠し、収益を止める", () => {
  it("台帳のどれか 1 つでも期限切れなら、承認済み・鮮度内の Offer でも収益リンクを止める（サイト全体ブロック）", () => {
    // 台帳の PRICING（30日）が切れる最初の日は 2026-11-06。Offer 自体は根拠なし・期限先で「新鮮」にしておく
    const day = new Date("2026-11-06T00:00:00Z");
    const o = { ...approved(OFFERS.find((x) => x.offer_id === "freee_reservation") as Offer), valid_until: "2027-12-31", evidence: [] as string[] };
    expect(monetizationBlocked(day)).toBe(true);
    expect(monetizable(o, { flags: allOn, now: day })).toEqual({ ok: false, reason: "SERVICE_FACT_STALE" });
    expect(monetizationBlocked(new Date("2026-11-01T00:00:00Z"))).toBe(false);
    expect(monetizable(o, { flags: allOn, now: new Date("2026-11-01T00:00:00Z") }).ok).toBe(true);
  });
  it("valid_until を過ぎると料金が null になり、承認済みでも sponsored にならない", () => {
    const late = new Date("2027-03-01T00:00:00Z");
    const offers = OFFERS.map((o) => (o.offer_id === "freee_reservation" ? approved(o) : o));
    const sel = selectOffers("RESERVATION", "NOW", { flags: allOn, now: late, offers });
    const card = sel.cards.find((c) => c.offer_id === "freee_reservation");
    expect(card?.facts_visible).toBe(false);
    expect(card?.fee_summary).toBeNull();
    expect(card?.free_plan).toBeNull();
    expect(card?.sponsored).toBe(false);
    expect(sel.state).toBe("SERVICE_FACT_STALE");
    expect(monetizationBlocked(late)).toBe(true);
    expect(monetizationBlocked(NOW)).toBe(false);
  });
  it("根拠台帳の鮮度：料金 30 日・機能/方針 90 日", () => {
    expect(checkSource("FREEE_RES_PRICE", new Date("2026-11-05T00:00:00Z")).fresh).toBe(true);
    expect(checkSource("FREEE_RES_PRICE", new Date("2026-11-06T00:00:00Z")).fresh).toBe(false);
    expect(checkSource("GOOGLE_LINKS", new Date("2027-01-04T00:00:00Z")).fresh).toBe(true);
    expect(checkSource("GOOGLE_LINKS", new Date("2027-01-05T00:00:00Z")).fresh).toBe(false);
    expect(checkSource("UNKNOWN_ID", NOW).fresh).toBe(false);
    expect(staleSources(NOW)).toHaveLength(0);
    expect(staleSources(new Date("2028-01-01T00:00:00Z"))).toHaveLength(listSources().length);
  });
});

describe("Need が確定していない領域に候補は出ない", () => {
  it("LATER / NOT_PRIORITY / REVIEW_EXISTING / HIDDEN → 空", () => {
    for (const s of ["LATER", "NOT_PRIORITY", "REVIEW_EXISTING", "HIDDEN"] as const) {
      expect(selectOffers("CASHLESS", s, { flags: allOn, now: NOW }).cards).toHaveLength(0);
    }
  });
});

describe("A15 freee Starter を有料へ押し上げずに勧められる", () => {
  it("予約の候補に freee予約が無料プラン付きで出て、収益リンクは使わない", () => {
    const sel = selectOffers("RESERVATION", "NEXT", { flags: allOff, now: NOW });
    const card = sel.cards.find((c) => c.offer_id === "freee_reservation");
    expect(card).toBeDefined();
    expect(card?.free_plan).toContain("Starter");
    expect(card?.sponsored).toBe(false);
    expect(card?.audience_misfit.join("")).toContain("Starterで足りる");
  });
});

describe("Offer の根拠 id はすべて台帳にある", () => {
  it("evidence が未知 id を含まない", () => {
    const ids = new Set(listSources().map((s) => s.id));
    for (const o of OFFERS) for (const id of o.evidence) expect(ids.has(id)).toBe(true);
  });
});
