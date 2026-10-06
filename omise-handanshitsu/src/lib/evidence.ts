/**
 * 根拠台帳と鮮度（06_EVIDENCE_FRESHNESS.md）。
 * 固有名の数値 claim は必ず source id を持ち（A18/A19）、期限切れなら表示しない（A20 fail closed）。
 */
import freshnessJson from "../../config/freshness.json";
import registryJson from "../../config/evidence.registry.json";

export type EvidenceKind = "PRICING" | "FEATURE" | "POLICY";

export interface EvidenceSource {
  id: string;
  domain: string;
  kind: EvidenceKind;
  label: string;
  fact: string;
  verified_at: string; // YYYY-MM-DD
}

const FRESHNESS_DAYS = (freshnessJson as { days: Record<EvidenceKind, number> }).days;
const SOURCES: EvidenceSource[] = (registryJson as { sources: EvidenceSource[] }).sources;
const BY_ID = new Map(SOURCES.map((s) => [s.id, s]));

export const REGISTRY_VERIFIED_AT: string = (registryJson as { verified_at: string }).verified_at;

export function listSources(): EvidenceSource[] {
  return SOURCES;
}

export function getSource(id: string): EvidenceSource | undefined {
  return BY_ID.get(id);
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function parseDate(ymd: string): Date {
  // 日付のみ（UTC 00:00）として扱い、タイムゾーンで日付がずれないようにする
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1));
}

export function daysBetween(from: string, to: Date): number {
  return Math.floor((to.getTime() - parseDate(from).getTime()) / DAY_MS);
}

export function freshnessDays(kind: EvidenceKind): number {
  return FRESHNESS_DAYS[kind];
}

export interface FreshnessCheck {
  id: string;
  fresh: boolean;
  known: boolean;
  verified_at: string | null;
  expires_at: string | null;
  kind: EvidenceKind | null;
}

export function checkSource(id: string, now: Date): FreshnessCheck {
  const s = BY_ID.get(id);
  if (!s) return { id, fresh: false, known: false, verified_at: null, expires_at: null, kind: null };
  const limit = FRESHNESS_DAYS[s.kind];
  const age = daysBetween(s.verified_at, now);
  const expires = new Date(parseDate(s.verified_at).getTime() + limit * DAY_MS);
  return {
    id,
    fresh: age >= 0 && age <= limit,
    known: true,
    verified_at: s.verified_at,
    expires_at: expires.toISOString().slice(0, 10),
    kind: s.kind,
  };
}

/** すべての source が新鮮なら true。未知の id は stale 扱い（fail closed） */
export function allFresh(ids: string[], now: Date): boolean {
  return ids.every((id) => checkSource(id, now).fresh);
}

/** サイト全体で期限切れの material fact があるか（stale > 0 → monetization block） */
export function staleSources(now: Date): EvidenceSource[] {
  return SOURCES.filter((s) => !checkSource(s.id, now).fresh);
}

export function formatDateJa(ymd: string): string {
  const [y, m, d] = ymd.split("-");
  return `${y}年${Number(m)}月${Number(d)}日`;
}
