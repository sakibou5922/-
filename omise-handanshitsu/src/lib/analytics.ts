/**
 * 計測イベント（07_SEO_ANALYTICS.md）。
 * 外部 SDK は使わない。window.dataLayer があれば push し、開発時は console に出すだけ。
 * 個人情報・診断の回答そのものは送らない。
 */
export type EventName =
  | "entry_view"
  | "article_decision_view"
  | "mini_check_start"
  | "mini_check_complete"
  | "diagnosis_start"
  | "diagnosis_answer"
  | "diagnosis_complete"
  | "result_view"
  | "result_now_item_view"
  | "result_next_item_view"
  | "result_not_priority_view"
  | "offer_impression"
  | "affiliate_outbound"
  | "official_outbound"
  | "smask_consultation_view"
  | "smask_consultation_click";

export type EventProps = Record<string, string | number | boolean>;

interface DataLayerWindow extends Window {
  dataLayer?: Array<Record<string, unknown>>;
}

export function track(name: EventName, props: EventProps = {}): void {
  if (typeof window === "undefined") return;
  const w = window as DataLayerWindow;
  const payload = { event: name, ...props, ts: Date.now() };
  if (Array.isArray(w.dataLayer)) w.dataLayer.push(payload);
  if (process.env.NODE_ENV !== "production") {
    console.debug("[track]", payload);
  }
}
