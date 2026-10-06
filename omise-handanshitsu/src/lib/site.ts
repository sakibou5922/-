/**
 * ブランド・機能フラグ・ルート設定（config/ の単一データ層）。
 * ブランド名は config/brand.json で一元管理し、公開前に変更できる構造を保つ（10_BRAND_CLEARANCE_NOTE.md）。
 */
import brandJson from "../../config/brand.json";
import featuresJson from "../../config/features.json";
import routesJson from "../../config/routes.json";

export interface Brand {
  brand_name: string;
  descriptor: string;
  core_message: string;
  site_url: string;
  operator_name: string;
  operator_name_short: string;
  trademark_clearance: string;
  domain_purchase: string;
  public_release: boolean;
  contact_note: string;
}

export const BRAND: Brand = brandJson as Brand;

const FLAG_NAMES = [
  "affiliate_square_enabled",
  "partner_freee_reservation_enabled",
  "affiliate_freee_accounting_enabled",
  "smask_consultation_enabled",
  "public_release_enabled",
] as const;

export type FlagName = (typeof FLAG_NAMES)[number];
export type Flags = Record<FlagName, boolean>;
export type EnvLike = Record<string, string | undefined>;

/**
 * 既定は config/features.json（すべて false）。
 * 環境変数 FLAG_<NAME>=true でサーバー側だけ上書きできる（プレビュー検証用）。
 */
export function loadFlags(env: EnvLike = process.env): Flags {
  const out = {} as Flags;
  for (const name of FLAG_NAMES) {
    const fromConfig = Boolean((featuresJson as Record<string, unknown>)[name]);
    const fromEnv = env[`FLAG_${name.toUpperCase()}`];
    out[name] = fromEnv === undefined ? fromConfig : fromEnv === "true";
  }
  return out;
}

export const FLAGS: Flags = loadFlags();

export const PUBLIC_ROUTES: string[] = (routesJson as { public_routes: string[] }).public_routes;

/** routes.json の noindex_patterns（末尾 * は前方一致）を前方一致の接頭辞に正規化したもの */
export const NOINDEX_PREFIXES: string[] = (routesJson as { noindex_patterns: string[] }).noindex_patterns.map((p) =>
  p.endsWith("*") ? p.slice(0, -1) : p,
);

export function isNoindexPath(pathname: string): boolean {
  return NOINDEX_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function siteUrl(env: EnvLike = process.env): string {
  const u = env.NEXT_PUBLIC_SITE_URL?.trim();
  return (u && u.length > 0 ? u : BRAND.site_url).replace(/\/+$/, "");
}

/** 絶対 URL。ルート（"/"）は末尾スラッシュなし（canonical と sitemap を同じ綴りにする） */
export function absoluteUrl(pathname: string): string {
  const base = siteUrl();
  if (pathname === "/" || pathname === "") return base;
  return `${base}${pathname.startsWith("/") ? pathname : `/${pathname}`}`;
}

/** 公開判定: フラグ と brand.public_release の両方が true のときだけ公開扱い */
export function isPublicRelease(flags: Flags = FLAGS): boolean {
  return flags.public_release_enabled && BRAND.public_release;
}
