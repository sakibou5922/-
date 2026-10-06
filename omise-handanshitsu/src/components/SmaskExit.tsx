"use client";

import Link from "next/link";
import { track } from "@/lib/analytics";
import { TrackView } from "./TrackView";

interface Props {
  operatorName: string;
}

/**
 * SMASK Exit（05_REVENUE_OFFER_RULES.md）。
 * 既定 DISABLED。smask_consultation_enabled かつ INTEGRATION 候補のときだけ親が描画する。
 */
export function SmaskExit({ operatorName }: Props) {
  return (
    <aside className="smask-exit" aria-labelledby="smask-exit-title">
      <TrackView name="smask_consultation_view" />
      <h3 id="smask-exit-title">既製サービスの組み合わせだけでは解決しにくい可能性があります。</h3>
      <p>
        3つ以上のサービスを使い、手作業の二重入力が残っている場合、既製サービスの連携だけでは解消しないことがあります。独自のワークフロー、CSV/APIによる連携など、仕組みづくりの相談先として運営会社（{operatorName}）の窓口があります。
      </p>
      <Link href="/operator#consultation" className="btn btn--ghost" onClick={() => track("smask_consultation_click")}>
        仕組みづくりを相談する
      </Link>
      <p className="btn-support">遷移先は {operatorName} への相談窓口です。診断結果や判断の内容が変わることはありません。</p>
    </aside>
  );
}
