/**
 * 記事のミニチェック → 8問チェック への事前入力（同じ質問を再質問しない）。
 * sessionStorage に置き、読んだ時点で消す（消費型）。保存目的では使わない。
 * 依存ゼロのモジュール（クライアント同梱を最小にするため）。
 */
const KEY = "ohs.prefill";

export type Prefill = Record<string, string>;

export function writePrefill(prefill: Prefill): void {
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(prefill));
  } catch {
    /* storage unavailable: 事前入力なしで続行 */
  }
}

/** 読み取りと同時に削除する。次に /check を開いたときは白紙から */
export function takePrefill(): Prefill | null {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    window.sessionStorage.removeItem(KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const out: Prefill = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) if (typeof v === "string") out[k] = v;
    return out;
  } catch {
    return null;
  }
}
