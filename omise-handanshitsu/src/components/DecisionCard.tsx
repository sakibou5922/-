import Link from "next/link";
import { AREA_META } from "@/lib/decision/labels";
import type { AreaDecision } from "@/lib/decision/types";
import { StatusBadge } from "./StatusBadge";

interface Props {
  decision: AreaDecision;
  /** 記事から来た「気になっていた」領域 */
  highlight?: boolean;
}

export function DecisionCard({ decision: d, highlight = false }: Props) {
  const meta = AREA_META[d.area];
  return (
    <article
      className={`card decision decision--${d.status}`}
      aria-labelledby={`decision-${d.area}`}
      data-area={d.area}
      data-status={d.status}
    >
      <div className="decision__head">
        <StatusBadge status={d.status} />
        <h3 id={`decision-${d.area}`}>{meta.name}</h3>
        {highlight && <span className="entry-mark">気になっていたもの</span>}
      </div>
      {d.reasons.length > 0 && (
        <ul className="decision__reasons">
          {d.reasons.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      )}
      <dl className="decision__sub">
        {d.review_points.length > 0 && (
          <div>
            <dt>見直す観点</dt>
            <dd>
              <ul>
                {d.review_points.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </dd>
          </div>
        )}
        {d.alternative && (
          <div>
            <dt>代わりに</dt>
            <dd>{d.alternative}</dd>
          </div>
        )}
        {d.next_action && (
          <div>
            <dt>次にやること</dt>
            <dd>{d.next_action}</dd>
          </div>
        )}
        {d.measure.length > 0 && (
          <div>
            <dt>導入後に測るもの</dt>
            <dd>{d.measure.join("・")}</dd>
          </div>
        )}
      </dl>
      <p className="decision__link">
        <Link href={d.href}>{meta.name}の判断基準を読む →</Link>
      </p>
    </article>
  );
}
