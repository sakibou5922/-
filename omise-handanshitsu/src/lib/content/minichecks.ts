/**
 * 記事ごとの5問ミニチェック（04_CONTENT_MATRIX.md）。
 * クライアント（MiniCheck コンポーネント）が直接 import する小さなモジュール。記事本文はここに置かない。
 */
import type { SingleQuestionKey } from "../decision/types";

export interface MiniCheckOption {
  value: string;
  label: string;
}

export interface MiniCheckQuestion {
  id: string;
  text: string;
  options: MiniCheckOption[];
  /** 8問チェックへの事前入力（同じ質問を再質問しない） */
  prefill?: { key: SingleQuestionKey; map: Record<string, string> };
}

export type NeedLevel = "CONFIRMED" | "CONDITIONAL" | "NOT_NOW";

export interface MiniCheckState {
  id: string;
  label: string;
  summary: string;
  next: string;
  need: NeedLevel;
}

export interface MiniCheck {
  lead: string;
  questions: MiniCheckQuestion[];
  states: MiniCheckState[];
  resolve: (answers: Record<string, string>) => string;
}


type MiniCheckSlug = "hotpepper-beauty" | "reservation-system" | "pos-register" | "cashless-payment" | "line-official";

export const MINI_CHECKS: Record<MiniCheckSlug, MiniCheck> = {
  "hotpepper-beauty": {
  lead: "5つ答えると、いまのお店に近い判断が出ます。",
  questions: [
    {
      id: "need_new",
      text: "新規のお客さまは、いま必要ですか？",
      options: [
        { value: "NEED_MORE", label: "もっと必要" },
        { value: "ENOUGH", label: "足りている" },
        { value: "CAPACITY_FULL", label: "受け入れが限界に近い" },
      ],
      prefill: { key: "new_customer_state", map: { NEED_MORE: "NEED_MORE", ENOUGH: "ENOUGH", CAPACITY_FULL: "CAPACITY_FULL" } },
    },
    {
      id: "dependency",
      text: "新規客のうち、媒体経由はどのくらいですか？",
      options: [
        { value: "NOT_USING", label: "まだ使っていない" },
        { value: "HIGH", label: "大半が媒体経由" },
        { value: "MEDIUM", label: "半分くらい" },
        { value: "LOW", label: "少ない" },
      ],
      prefill: { key: "platform_dependency", map: { HIGH: "HIGH", MEDIUM: "MEDIUM", LOW: "LOW" } },
    },
    {
      id: "cost_known",
      text: "月の媒体関連費（掲載費＋予約利用料など）を把握していますか？",
      options: [
        { value: "YES", label: "把握している" },
        { value: "NO", label: "把握していない" },
      ],
    },
    {
      id: "count_known",
      text: "媒体経由の新規来店数を、月ごとに把握していますか？",
      options: [
        { value: "YES", label: "把握している" },
        { value: "NO", label: "把握していない" },
      ],
    },
    {
      id: "direct",
      text: "媒体以外の予約導線（Google・電話・LINE・自社サイト）はありますか？",
      options: [
        { value: "YES", label: "ある" },
        { value: "NO", label: "ほぼない" },
      ],
    },
  ],
  states: [
    { id: "USE_OR_TEST", label: "使う・試す合理性がある", summary: "新規客が必要で、まだ媒体を使っていない状態です。月に払える上限と、見る数字（新規数・CAC・再来率）を決めてから問い合わせてください。", next: "掲載条件を問い合わせる前に、月の上限額と測る数字を書き出す。", need: "CONFIRMED" },
    { id: "USE_AND_BUILD_OWN", label: "使いながら、自前の導線を育てる", summary: "成果は出ていても、媒体を止めると集客が止まる状態です。続けながら、Google・直接予約・紹介を育てる段階です。", next: "Googleビジネスプロフィールと直接予約の導線を、今月中に1つ増やす。", need: "CONDITIONAL" },
    { id: "MEASURE_FIRST", label: "まず数字を出す", summary: "費用か新規数を把握していないため、続ける・やめるを判断できる状態ではありません。直近3〜6か月の数字を出すのが最優先です。", next: "直近3〜6か月の媒体関連費・新規数・再来率を出す。", need: "CONDITIONAL" },
    { id: "LOW_PRIORITY", label: "優先度は低い", summary: "新規客が足りている、または受け入れが限界に近い状態です。追加の集客にお金をかける段階ではありません。", next: "受け入れ余力と再来率を見ながら、必要になったら再検討する。", need: "NOT_NOW" },
  ],
  resolve: (a) => {
    const using = a.dependency !== undefined && a.dependency !== "NOT_USING";
    if (using && (a.cost_known === "NO" || a.count_known === "NO")) return "MEASURE_FIRST";
    if (using && a.dependency === "HIGH") return "USE_AND_BUILD_OWN";
    if (a.need_new === "NEED_MORE") return using ? "USE_AND_BUILD_OWN" : "USE_OR_TEST";
    return "LOW_PRIORITY";
  },
  },
  "reservation-system": {
  lead: "5つ答えると、いまの予約管理の負荷に近い判断が出ます。",
  questions: [
    {
      id: "model",
      text: "来店は予約が中心ですか？",
      options: [
        { value: "APPOINTMENT", label: "ほぼ予約制" },
        { value: "MIXED", label: "予約と飛び込みが半々" },
        { value: "WALKIN", label: "ほぼ飛び込み" },
      ],
      prefill: { key: "reservation_model", map: { APPOINTMENT: "APPOINTMENT_DOMINANT", MIXED: "MIXED", WALKIN: "WALKIN_DOMINANT" } },
    },
    {
      id: "channels",
      text: "予約の受付経路はいくつありますか？",
      options: [
        { value: "ONE", label: "1つ（電話だけ、など）" },
        { value: "TWO_PLUS", label: "2つ以上（電話＋LINE＋DM など）" },
      ],
    },
    {
      id: "after_hours",
      text: "営業時間外に予約を受けたい、または取りこぼしていますか？",
      options: [
        { value: "YES", label: "ある" },
        { value: "NO", label: "ない" },
      ],
    },
    {
      id: "trouble",
      text: "予約漏れ・二重予約・変更のミスが起きたことは？",
      options: [
        { value: "YES", label: "ある" },
        { value: "NO", label: "ない" },
      ],
    },
    {
      id: "staff",
      text: "予約を扱うスタッフの人数は？",
      options: [
        { value: "SOLO", label: "自分ひとり" },
        { value: "SMALL", label: "2〜3人" },
        { value: "TEAM", label: "4人以上" },
      ],
      prefill: { key: "staff_count", map: { SOLO: "SOLO", SMALL: "SMALL_2_3", TEAM: "TEAM_4_PLUS" } },
    },
  ],
  states: [
    { id: "MANUAL_OK", label: "手動で十分", summary: "いまの受付方法で困っていない状態です。有料の予約システムを急ぐ必要はありません。", next: "予約漏れや営業時間外の取りこぼしが出たら、そのときに見直す。", need: "NOT_NOW" },
    { id: "FREE_STARTER_FIT", label: "無料プランで試す価値がある", summary: "営業時間外の予約や経路の増加が見えている状態です。まず無料プランで予約ページを作り、必要かどうかを1か月で確かめます。", next: "無料プランで予約ページだけ作り、営業時間外の予約数を数える。", need: "CONFIRMED" },
    { id: "SYSTEM_RECOMMENDED", label: "システム化する価値が高い", summary: "複数経路・複数スタッフ・漏れや二重予約のいずれかが重なっています。受付経路を寄せて、リマインドと空き枠を自動化する段階です。", next: "受付経路をどこに寄せるか決め、無料プランから始めて必要な機能だけ足す。", need: "CONFIRMED" },
    { id: "INTEGRATION_REVIEW", label: "経路の一本化と連携を見直す", summary: "経路が分散して漏れが起き、スタッフも複数です。新しいシステムを足す前に、受付経路の一本化と既存ツールの連携を見直します。", next: "受付経路を1つに決め、既存のLINE・台帳との連携可否を確認する。", need: "CONDITIONAL" },
  ],
  resolve: (a) => {
    if (a.model === "WALKIN") return "MANUAL_OK";
    if (a.channels === "TWO_PLUS" && a.trouble === "YES" && a.staff !== "SOLO") return "INTEGRATION_REVIEW";
    let s = 0;
    s += a.model === "APPOINTMENT" ? 2 : a.model === "MIXED" ? 1 : 0;
    s += a.channels === "TWO_PLUS" ? 1 : 0;
    s += a.after_hours === "YES" ? 1 : 0;
    s += a.trouble === "YES" ? 2 : 0;
    s += a.staff === "SMALL" ? 1 : a.staff === "TEAM" ? 2 : 0;
    if (s >= 5) return "SYSTEM_RECOMMENDED";
    if (s >= 2) return "FREE_STARTER_FIT";
    return "MANUAL_OK";
  },
  },
  "pos-register": {
  lead: "5つ答えると、いまのお店に近い判断が出ます。",
  questions: [
    {
      id: "items",
      text: "商品・メニューの数は？",
      options: [
        { value: "FEW", label: "少ない（20未満）" },
        { value: "MANY", label: "多い（20以上）" },
      ],
    },
    {
      id: "inventory",
      text: "在庫の管理は？",
      options: [
        { value: "NONE", label: "不要" },
        { value: "LIGHT", label: "軽い（たまに数える程度）" },
        { value: "IMPORTANT", label: "重要（欠品・ロスが売上に直結）" },
      ],
      prefill: { key: "ops_complexity", map: { NONE: "SIMPLE", LIGHT: "MULTI_LOW_INVENTORY", IMPORTANT: "INVENTORY_IMPORTANT" } },
    },
    {
      id: "staff",
      text: "レジを扱うスタッフの人数は？",
      options: [
        { value: "SOLO", label: "自分ひとり" },
        { value: "SMALL", label: "2〜3人" },
        { value: "TEAM", label: "4人以上" },
      ],
      prefill: { key: "staff_count", map: { SOLO: "SOLO", SMALL: "SMALL_2_3", TEAM: "TEAM_4_PLUS" } },
    },
    {
      id: "analysis",
      text: "商品別・担当別の売上を見たいですか？",
      options: [
        { value: "YES", label: "見たい" },
        { value: "NO", label: "今は不要" },
      ],
    },
    {
      id: "integration",
      text: "キャッシュレス決済や会計ソフトと連携したいですか？",
      options: [
        { value: "YES", label: "したい" },
        { value: "NO", label: "今は不要" },
      ],
    },
  ],
  states: [
    { id: "SIMPLE_REGISTER_OK", label: "簡易なレジで十分", summary: "メニューが少なく、在庫管理が不要で、1人運営です。高度なPOSの価値はまだ出ていません。", next: "無料のレジアプリか手書き伝票＋表計算で、売上だけ記録する。", need: "NOT_NOW" },
    { id: "FREE_POS_FIT", label: "無料POSで始める", summary: "売上記録を楽にする価値はありますが、高度な機能は不要です。無料のPOSアプリで十分です。", next: "無料POSアプリで商品を登録し、締め作業の時間がどれだけ減るか測る。", need: "CONFIRMED" },
    { id: "ADVANCED_POS_FIT", label: "高機能POSの価値がある", summary: "在庫・品目・スタッフ・分析のいずれかが重なっています。締め作業と転記を手でやる負担が大きい状態です。", next: "在庫と分析の要件を書き出し、連携範囲で候補を比べる。", need: "CONFIRMED" },
    { id: "INTEGRATION_REVIEW", label: "連携を前提に選ぶ", summary: "決済や会計と連携したい状態です。POS単体ではなく、連携先を先に決めてから選びます。", next: "連携したい決済・会計ソフトを先に決め、対応するPOSから選ぶ。", need: "CONDITIONAL" },
  ],
  resolve: (a) => {
    if (a.items === "FEW" && a.inventory === "NONE" && a.staff === "SOLO") return "SIMPLE_REGISTER_OK";
    let s = 0;
    s += a.items === "MANY" ? 2 : 0;
    s += a.inventory === "LIGHT" ? 1 : a.inventory === "IMPORTANT" ? 3 : 0;
    s += a.staff === "SMALL" ? 1 : a.staff === "TEAM" ? 2 : 0;
    s += a.analysis === "YES" ? 1 : 0;
    s += a.integration === "YES" ? 1 : 0;
    if (s >= 5) return "ADVANCED_POS_FIT";
    if (a.integration === "YES") return "INTEGRATION_REVIEW";
    return "FREE_POS_FIT";
  },
  },
  "cashless-payment": {
  lead: "5つ答えると、手数料を払う価値があるかの目安が出ます。",
  questions: [
    {
      id: "onsite",
      text: "店頭での支払いは、どのくらいありますか？",
      options: [
        { value: "MOST", label: "ほとんどが店頭" },
        { value: "SOME", label: "店頭と振込・請求が混ざる" },
        { value: "LITTLE", label: "店頭はほぼない" },
      ],
      prefill: { key: "onsite_payment", map: { MOST: "MOST", SOME: "SOME", LITTLE: "LITTLE" } },
    },
    {
      id: "requests",
      text: "お客さまから「カード使える？」と聞かれる頻度は？",
      options: [
        { value: "OFTEN", label: "よくある" },
        { value: "SOMETIMES", label: "たまにある" },
        { value: "NEVER", label: "ほぼない" },
      ],
    },
    {
      id: "ticket",
      text: "客単価の目安は？",
      options: [
        { value: "HIGH", label: "5,000円以上" },
        { value: "MID", label: "2,000〜5,000円" },
        { value: "LOW", label: "2,000円未満" },
      ],
    },
    {
      id: "monthly",
      text: "月の店頭売上の目安は？",
      options: [
        { value: "LARGE", label: "50万円以上" },
        { value: "MID", label: "20〜50万円" },
        { value: "SMALL", label: "20万円未満" },
      ],
    },
    {
      id: "cash",
      text: "現金の締め・釣り銭・両替の負担は？",
      options: [
        { value: "HEAVY", label: "大きい" },
        { value: "LIGHT", label: "小さい" },
      ],
    },
  ],
  states: [
    { id: "HIGH_FIT", label: "導入価値が高い", summary: "店頭決済が多く、要望や現金管理の負担も見えています。手数料を払っても、会計の速さと負担減で元が取れやすい状態です。", next: "月の店頭売上の想定額で手数料を試算し、固定費ゼロの候補から比べる。", need: "CONFIRMED" },
    { id: "CONDITIONAL", label: "条件付きで検討", summary: "店頭決済はありますが、要望や負担はまだ小さい状態です。要望が続くか、店頭決済が増えるかを見てから決めます。", next: "「カード使える？」と聞かれた回数を1か月記録する。", need: "CONDITIONAL" },
    { id: "LOW_PRIORITY", label: "優先度は低い", summary: "店頭決済がほぼない、または要望が確認できない状態です。決済手数料を払う価値が出にくいため、今は入れない判断で問題ありません。", next: "請求書・振込の受け方を整え、店頭決済が増えたら再検討する。", need: "NOT_NOW" },
  ],
  resolve: (a) => {
    if (a.onsite === "LITTLE") return "LOW_PRIORITY";
    let s = 0;
    s += a.onsite === "MOST" ? 3 : a.onsite === "SOME" ? 1 : 0;
    s += a.requests === "OFTEN" ? 2 : a.requests === "SOMETIMES" ? 1 : 0;
    s += a.ticket === "HIGH" ? 1 : 0;
    s += a.monthly === "LARGE" ? 1 : 0;
    s += a.cash === "HEAVY" ? 1 : 0;
    if (s >= 5) return "HIGH_FIT";
    if (s >= 2) return "CONDITIONAL";
    return "LOW_PRIORITY";
  },
  },
  "line-official": {
  lead: "5つ答えると、作る前に決めるべきことが分かります。",
  questions: [
    {
      id: "repeat",
      text: "同じお客さまが繰り返し来る割合は？",
      options: [
        { value: "HIGH", label: "高い（再来が中心）" },
        { value: "MEDIUM", label: "ふつう" },
        { value: "LOW", label: "低い（一見客が中心）" },
      ],
      prefill: { key: "repeat_rate", map: { HIGH: "HIGH", MEDIUM: "MEDIUM", LOW: "LOW" } },
    },
    {
      id: "customers",
      text: "いまの顧客（来店したことのある人）の数は？",
      options: [
        { value: "NONE_YET", label: "まだいない（開業前）" },
        { value: "FEW", label: "100人未満" },
        { value: "MANY", label: "100人以上" },
      ],
    },
    {
      id: "purpose",
      text: "送る内容（予約確認・再来案内・お知らせ）は決まっていますか？",
      options: [
        { value: "CLEAR", label: "決まっている" },
        { value: "VAGUE", label: "まだ曖昧" },
      ],
    },
    {
      id: "owner",
      text: "配信を担当する人は決まっていますか？",
      options: [
        { value: "YES", label: "決まっている" },
        { value: "NO", label: "決まっていない" },
      ],
    },
    {
      id: "funnel",
      text: "予約や再来の導線としてLINEを使いたいですか？",
      options: [
        { value: "YES", label: "使いたい" },
        { value: "NO", label: "お知らせだけ" },
      ],
    },
  ],
  states: [
    { id: "START_FREE", label: "無料で小さく始める", summary: "再来はあるものの、目的や担当がまだ曖昧です。無料プランで作り、「何を・誰に・月何回」を決めてから案内を始めます。", next: "送る内容を1つに絞り、担当者を決めてから無料プランで作る。", need: "CONDITIONAL" },
    { id: "USE_WITH_PURPOSE", label: "目的を決めて使う", summary: "再来が中心で、送る内容と担当が決まっています。予約・再来につなげる配信に絞って運用する段階です。", next: "無料プランで始め、友だち数と月の配信回数から必要通数を測る。", need: "CONFIRMED" },
    { id: "SCALE_AFTER_VALUE", label: "成果が出てから広げる", summary: "顧客数が多く、無料枠を超える可能性があります。予約・再来への効果を測ってから、有料プランに上げるかを決めます。", next: "無料枠で2か月運用し、予約・再来につながった数を数えてからプランを決める。", need: "CONFIRMED" },
    { id: "NOT_PRIORITY", label: "今は優先しない", summary: "再来が少ない、または顧客がまだいない状態です。送る相手が少ないうちは、来店客を増やすことのほうが先です。", next: "まず来店客を増やし、再来客が見えてきたら作る。", need: "NOT_NOW" },
  ],
  resolve: (a) => {
    if (a.repeat === "LOW" || a.customers === "NONE_YET") return "NOT_PRIORITY";
    if (a.purpose === "CLEAR" && a.owner === "YES") {
      return a.customers === "MANY" ? "SCALE_AFTER_VALUE" : "USE_WITH_PURPOSE";
    }
    return "START_FREE";
  },
  },
};

export function getMiniCheck(slug: string): MiniCheck | undefined {
  return (MINI_CHECKS as Record<string, MiniCheck | undefined>)[slug];
}
