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
const DAY_MS = 24 * 60 * 60 * 1000;

export const REGISTRY_VERIFIED_AT: string = (registryJson as { verified_at: string }).verified_at;

export function listSources(): EvidenceSource[] {
  return SOURCES;
}

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

function sourceFresh(s: EvidenceSource, now: Date): boolean {
  const age = daysBetween(s.verified_at, now);
  return age >= 0 && age <= FRESHNESS_DAYS[s.kind];
}

/** 未知の id は stale 扱い（fail closed） */
export function isFresh(id: string, now: Date): boolean {
  const s = BY_ID.get(id);
  return s !== undefined && sourceFresh(s, now);
}

export interface FreshnessCheck {
  fresh: boolean;
  verified_at: string | null;
}

export function checkSource(id: string, now: Date): FreshnessCheck {
  const s = BY_ID.get(id);
  return { fresh: s !== undefined && sourceFresh(s, now), verified_at: s?.verified_at ?? null };
}

/** すべての source が新鮮なら true */
export function allFresh(ids: string[], now: Date): boolean {
  return ids.every((id) => isFresh(id, now));
}

/** 台帳に期限切れの material fact があるか（stale > 0 → monetization block） */
export function staleSources(now: Date): EvidenceSource[] {
  return SOURCES.filter((s) => !sourceFresh(s, now));
}

export function anyStale(now: Date): boolean {
  return SOURCES.some((s) => !sourceFresh(s, now));
}
