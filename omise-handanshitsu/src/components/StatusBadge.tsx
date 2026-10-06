import { STATUS_META } from "@/lib/decision/labels";
import type { VisibleStatus } from "@/lib/decision/types";

export function StatusBadge({ status }: { status: VisibleStatus }) {
  return <span className={`status status--${status}`}>{STATUS_META[status].label}</span>;
}
