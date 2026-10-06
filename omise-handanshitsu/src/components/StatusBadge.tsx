import { STATUS_META } from "@/lib/decision/labels";
import type { Status } from "@/lib/decision/types";

export function StatusBadge({ status }: { status: Status }) {
  if (status === "HIDDEN") return null;
  return <span className={`status status--${status}`}>{STATUS_META[status].label}</span>;
}
