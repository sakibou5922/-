import type {
  Area,
  DiagnosisAnswers,
  Factor,
  QuestionKey,
  SingleQuestionKey,
  Status,
} from "./types";

/* ------------------------------------------------------------------ */
/* 質問定義（8問 + 条件付き3問）                                        */
/* ------------------------------------------------------------------ */

export interface OptionDef {
  value: string;
  label: string;
  hint?: string;
}

export interface QuestionDef {
  id: string;
  key: QuestionKey;
  type: "single" | "multi";
  title: string;
  help?: string;
  options: OptionDef[];
  /** 条件付き質問。true のときだけ出す */
  when?: (a: Partial<DiagnosisAnswers>) => boolean;
}

export function existingCount(a: Partial<DiagnosisAnswers>): number {
  return (a.existing_services ?? []).filter((s) => s !== "NONE").length;
}

export const QUESTIONS: QuestionDef[] = [
  {
    id: "Q1",
    key: "stage",
    type: "single",
    title: "お店は、いまどの段階ですか？",
    help: "開業前は「開業日までの日数」で選んでください。",
    options: [
      { value: "PRE_OPEN_90_PLUS", label: "開業まで90日以上", hint: "物件や資金の検討中" },
      { value: "PRE_OPEN_31_90", label: "開業まで31〜90日", hint: "内装・備品を決めている" },
      { value: "PRE_OPEN_0_30", label: "開業まで30日以内", hint: "オープン直前" },
      { value: "OPERATING", label: "すでに営業している" },
    ],
  },
  {
    id: "Q2",
    key: "business_type",
    type: "single",
    title: "業種は、どれに近いですか？",
    help: "業種は判断の弱い補正にだけ使います。実際の運営の答えを優先します。",
    options: [
      { value: "BEAUTY_SALON", label: "美容室・理容・ネイル・まつげ" },
      { value: "HEALTH_TREATMENT", label: "整体・鍼灸・リラクゼーション" },
      { value: "FOOD", label: "飲食・カフェ・テイクアウト" },
      { value: "RETAIL", label: "物販・小売" },
      { value: "LESSON_SCHOOL", label: "教室・スクール" },
      { value: "FITNESS", label: "ジム・ヨガ・パーソナル" },
      { value: "PET", label: "ペット（トリミングなど）" },
      { value: "OTHER_FACE_TO_FACE", label: "その他の対面サービス" },
    ],
  },
  {
    id: "Q3",
    key: "reservation_model",
    type: "single",
    title: "お客さまの来店は、予約が中心ですか？",
    options: [
      { value: "APPOINTMENT_DOMINANT", label: "ほぼ予約制" },
      { value: "MIXED", label: "予約と飛び込みが半々くらい" },
      { value: "WALKIN_DOMINANT", label: "ほぼ飛び込み（予約なし）" },
    ],
  },
  {
    id: "Q4",
    key: "onsite_payment",
    type: "single",
    title: "お店での支払い（店頭決済）は、どのくらいありますか？",
    options: [
      { value: "MOST", label: "ほとんどが店頭で支払う" },
      { value: "SOME", label: "店頭と振込・請求が混ざる" },
      { value: "LITTLE", label: "店頭での支払いはほぼない", hint: "請求書・振込・月謝が中心" },
    ],
  },
  {
    id: "Q5",
    key: "ops_complexity",
    type: "single",
    title: "商品・メニューと在庫の管理は？",
    options: [
      { value: "SIMPLE", label: "メニューが少なく、在庫管理は不要" },
      { value: "MULTI_LOW_INVENTORY", label: "品目は多いが、在庫管理は軽い" },
      { value: "INVENTORY_IMPORTANT", label: "在庫の管理が重要" },
    ],
  },
  {
    id: "Q6",
    key: "staff_count",
    type: "single",
    title: "スタッフの人数は？",
    help: "オーナー本人を含めた人数です。",
    options: [
      { value: "SOLO", label: "自分ひとり" },
      { value: "SMALL_2_3", label: "2〜3人" },
      { value: "TEAM_4_PLUS", label: "4人以上" },
    ],
  },
  {
    id: "Q7",
    key: "repeat_rate",
    type: "single",
    title: "同じお客さまが、繰り返し来る割合は？",
    help: "開業前なら、想定で構いません。",
    options: [
      { value: "HIGH", label: "高い（再来が中心）" },
      { value: "MEDIUM", label: "ふつう" },
      { value: "LOW", label: "低い（一見のお客さまが中心）" },
    ],
  },
  {
    id: "Q8",
    key: "existing_services",
    type: "multi",
    title: "すでに使っているものは？",
    help: "複数選べます。まだ何もなければ「まだ何も使っていない」を選んでください。",
    options: [
      { value: "GOOGLE_BUSINESS", label: "Googleビジネスプロフィール" },
      { value: "EXTERNAL_PLATFORM", label: "外部の集客媒体", hint: "ホットペッパーなど" },
      { value: "LINE", label: "LINE公式アカウント" },
      { value: "RESERVATION", label: "予約システム" },
      { value: "CASHLESS", label: "キャッシュレス決済" },
      { value: "POS", label: "POSレジ" },
      { value: "ACCOUNTING", label: "会計ソフト" },
      { value: "WEBSITE", label: "自社サイト" },
      { value: "NONE", label: "まだ何も使っていない" },
    ],
  },
  {
    id: "CQ1",
    key: "platform_dependency",
    type: "single",
    title: "新規のお客さまのうち、外部媒体経由はどのくらいですか？",
    when: (a) => (a.existing_services ?? []).includes("EXTERNAL_PLATFORM"),
    options: [
      { value: "HIGH", label: "大半が媒体経由" },
      { value: "MEDIUM", label: "半分くらい" },
      { value: "LOW", label: "少ない" },
      { value: "UNKNOWN", label: "把握していない" },
    ],
  },
  {
    id: "CQ2",
    key: "manual_duplication",
    type: "single",
    title: "サービス同士で、同じ情報を手で入力し直すことはありますか？",
    help: "例：予約台帳の内容をレジにも打ち直す、売上を会計に転記する。",
    when: (a) => existingCount(a) >= 3,
    options: [
      { value: "YES", label: "ある（二重入力が負担）" },
      { value: "NO", label: "ない" },
      { value: "UNKNOWN", label: "わからない" },
    ],
  },
  {
    id: "CQ3",
    key: "new_customer_state",
    type: "single",
    title: "新規のお客さまは、足りていますか？",
    when: (a) => a.stage === "OPERATING",
    options: [
      { value: "NEED_MORE", label: "もっと必要" },
      { value: "ENOUGH", label: "足りている" },
      { value: "CAPACITY_FULL", label: "受け入れが限界に近い" },
      { value: "UNKNOWN", label: "わからない" },
    ],
  },
];

export const QUESTION_BY_KEY: Record<QuestionKey, QuestionDef> = Object.fromEntries(
  QUESTIONS.map((q) => [q.key, q]),
) as Record<QuestionKey, QuestionDef>;

export function optionLabel(key: QuestionKey, value: string): string {
  return QUESTION_BY_KEY[key].options.find((o) => o.value === value)?.label ?? value;
}

/* ------------------------------------------------------------------ */
/* 理由文に使う言い回し                                                  */
/* ------------------------------------------------------------------ */

const FACTOR_PHRASES: Record<SingleQuestionKey, Record<string, string>> = {
  stage: {
    PRE_OPEN_90_PLUS: "開業まで90日以上ある",
    PRE_OPEN_31_90: "開業まで31〜90日",
    PRE_OPEN_0_30: "開業まで30日以内",
    OPERATING: "すでに営業中",
  },
  business_type: {
    BEAUTY_SALON: "美容系の業態",
    HEALTH_TREATMENT: "施術系の業態",
    FOOD: "飲食の業態",
    RETAIL: "物販の業態",
    LESSON_SCHOOL: "教室・スクールの業態",
    FITNESS: "フィットネス系の業態",
    PET: "ペット系の業態",
    OTHER_FACE_TO_FACE: "対面サービスの業態",
  },
  reservation_model: {
    APPOINTMENT_DOMINANT: "来店がほぼ予約制",
    MIXED: "予約と飛び込みが混在",
    WALKIN_DOMINANT: "来店がほぼ飛び込み",
  },
  onsite_payment: {
    MOST: "店頭での支払いが大半",
    SOME: "店頭と振込・請求が混在",
    LITTLE: "店頭での支払いがほぼない",
  },
  ops_complexity: {
    SIMPLE: "メニューが少なく在庫管理が不要",
    MULTI_LOW_INVENTORY: "品目は多いが在庫管理は軽い",
    INVENTORY_IMPORTANT: "在庫管理が重要",
  },
  staff_count: {
    SOLO: "ひとり運営",
    SMALL_2_3: "スタッフ2〜3人",
    TEAM_4_PLUS: "スタッフ4人以上",
  },
  repeat_rate: {
    HIGH: "再来が中心",
    MEDIUM: "再来はふつう",
    LOW: "一見のお客さまが中心",
  },
  platform_dependency: {
    HIGH: "新規客の大半が媒体経由",
    MEDIUM: "新規客の半分ほどが媒体経由",
    LOW: "媒体経由の新規客は少ない",
    UNKNOWN: "媒体経由の割合が未把握",
  },
  manual_duplication: {
    YES: "手作業の二重入力がある",
    NO: "二重入力はない",
    UNKNOWN: "二重入力の有無が未把握",
  },
  new_customer_state: {
    NEED_MORE: "新規客がもっと必要",
    ENOUGH: "新規客は足りている",
    CAPACITY_FULL: "受け入れが限界に近い",
    UNKNOWN: "新規客の充足が未把握",
  },
};

export function factorPhrase(f: Factor): string {
  return FACTOR_PHRASES[f.key]?.[f.value] ?? `${f.key}=${f.value}`;
}

function joinPhrases(factors: Factor[]): string {
  const phrases = factors.map(factorPhrase);
  if (phrases.length === 0) return "";
  if (phrases.length === 1) return phrases[0] ?? "";
  return `${phrases.slice(0, -1).join("、")}で、${phrases[phrases.length - 1]}`;
}

/* ------------------------------------------------------------------ */
/* 領域（Area）ごとの説明                                                 */
/* ------------------------------------------------------------------ */

export interface AreaMeta {
  name: string;
  short: string;
  href: string;
  measure: string[];
  alternative: string;
  review_points: string[];
  next_action: Partial<Record<Status, string>>;
}

export const AREA_META: Record<Area, AreaMeta> = {
  GOOGLE_FOUNDATION: {
    name: "Googleビジネスプロフィール",
    short: "Google",
    href: "/guide/opening-order",
    measure: ["店名検索の表示回数", "電話・経路・サイトのタップ数", "口コミ数と返信率"],
    alternative: "—",
    review_points: ["営業時間・住所・写真が最新か", "口コミに返信しているか", "予約リンクなど導線を置けているか"],
    next_action: {
      FREE_FOUNDATION: "オーナー確認を済ませ、営業時間・写真・説明文を今日中に埋める。",
      REVIEW_EXISTING: "営業時間・写真・口コミ返信を見直す。予約リンクが置けるなら置く。",
    },
  },
  RESERVATION: {
    name: "予約システム",
    short: "予約",
    href: "/need/reservation-system",
    measure: ["予約対応にかかる時間", "営業時間外の予約数", "予約漏れ・二重予約の件数", "キャンセル対応の手間", "予約経路の数"],
    alternative: "電話・LINE・DMで受け、紙かスプレッドシートの台帳で管理する。",
    review_points: ["有料プランの機能を使い切れているか", "受付経路が分散して二重管理になっていないか", "リマインド・キャンセル処理が自動化できているか"],
    next_action: {
      NOW: "直近1週間の予約対応時間と受付経路数を数え、無料プランで予約ページを試す。",
      NEXT: "無料プランで予約ページだけ作り、営業時間外の予約が入るかを1か月見る。",
      LATER: "予約漏れや二重予約が起きたら、そのときに見直す。",
      NOT_PRIORITY: "受付は今の方法のまま。予約が増えてきたら再確認する。",
      REVIEW_EXISTING: "プラン・受付経路・自動化の3点を確認する。",
    },
  },
  CASHLESS: {
    name: "キャッシュレス決済",
    short: "キャッシュレス",
    href: "/need/cashless-payment",
    measure: ["キャッシュレス利用率", "月間の決済手数料", "会計にかかる時間", "現金締めの時間", "お客さまからの要望数"],
    alternative: "現金と振込で受け、要望が出た回数を記録する。",
    review_points: ["手数料率が現在の条件として妥当か", "入金サイクルが資金繰りに合っているか", "レジ・会計との連携で転記が減っているか"],
    next_action: {
      NOW: "月の店頭売上の想定額で手数料を試算し、固定費ゼロの候補から比較する。",
      NEXT: "お客さまの要望を1か月記録し、要望が続くなら固定費ゼロの候補を試す。",
      LATER: "店頭決済が増えてきたら、そのときに試算する。",
      NOT_PRIORITY: "店頭決済がほぼないため、今は優先しない。請求・振込の方法を整える。",
      REVIEW_EXISTING: "手数料・入金サイクル・連携の3点を見直す。",
    },
  },
  POS: {
    name: "POSレジ",
    short: "POS",
    href: "/need/pos-register",
    measure: ["締め作業の時間", "在庫差異", "集計の時間", "転記の回数", "売上分析を見た頻度"],
    alternative: "無料のレジアプリか手書き伝票＋表計算で、売上だけ記録する。",
    review_points: ["有料機能を使っているか", "在庫・売上分析を実際に見ているか", "決済・会計と連携できているか"],
    next_action: {
      NOW: "商品・メニュー数と在庫の管理方法を書き出し、無料POSアプリで登録してみる。",
      NEXT: "無料POSアプリで売上記録だけ始め、在庫や分析が必要になった時点で機能を足す。",
      LATER: "品目やスタッフが増えたら、そのときに見直す。",
      NOT_PRIORITY: "ひとり運営で在庫管理が不要なため、高機能なPOSは今は優先しない。",
      REVIEW_EXISTING: "有料機能・分析・連携の3点を見直す。",
    },
  },
  ACCOUNTING: {
    name: "会計ソフト",
    short: "会計",
    href: "/guide/opening-order",
    measure: ["月次の記帳にかかる時間", "レシート・明細の取り込み率", "確定申告の準備時間"],
    alternative: "開業初月は表計算で収支を記録し、税理士に依頼するかを決める。",
    review_points: ["銀行・カード明細の自動取り込みを使えているか", "売上データの転記が残っていないか", "プランが取引量に合っているか"],
    next_action: {
      NEXT: "記帳を自分でやるか税理士に任せるかを決め、自分でやるなら明細連携できるソフトを選ぶ。",
      LATER: "開業30日前までに記帳の方法を決める。",
      REVIEW_EXISTING: "明細連携・転記・プランの3点を見直す。",
    },
  },
  LINE: {
    name: "LINE公式アカウント",
    short: "LINE",
    href: "/need/line-official",
    measure: ["友だちの純増数", "配信の到達数", "ブロック数", "予約・再来につながった数", "配信コスト"],
    alternative: "再来のお礼や次回予約は、会計時の一言と名刺・カードで十分なことが多い。",
    review_points: ["配信の目的と頻度が決まっているか", "ブロック率が上がっていないか", "予約や再来に実際につながっているか"],
    next_action: {
      NOW: "無料プランで作り、「何を」「誰に」「月に何回」送るかを先に決めてから案内する。",
      NEXT: "再来客が一定数ついたら無料プランで始め、必要な通数を測る。",
      LATER: "まずは来店客を増やすことを優先し、再来客が見えてきたら作る。",
      NOT_PRIORITY: "再来が少ない業態のため、今は優先しない。",
      REVIEW_EXISTING: "目的・ブロック率・成果の3点を見直す。",
    },
  },
  EXTERNAL_PLATFORM: {
    name: "外部の集客媒体",
    short: "集客媒体",
    href: "/need/hotpepper-beauty",
    measure: ["媒体経由の新規数", "新規1人あたりの獲得費（CAC）", "再来率", "6か月の顧客価値", "媒体依存率"],
    alternative: "Googleビジネスプロフィール・店名検索・紹介・SNSで直接の導線を育てる。",
    review_points: ["媒体関連費÷媒体経由新規数（CAC）を出しているか", "媒体を止めたときに残る経路があるか", "再来率が媒体経由とそれ以外で違うか"],
    next_action: {
      NEXT: "新規客が必要な理由と、月に払える上限額を決めてから、掲載条件を問い合わせる。",
      LATER: "まずGoogleビジネスプロフィールと直接の導線を整え、新規客の不足が見えたら検討する。",
      NOT_PRIORITY: "新規客は足りている（または受け入れが限界）ため、今は優先しない。",
      REVIEW_EXISTING: "CAC・依存度・再来率の3点を出し、続けるか・減らすかを判断する。",
    },
  },
  WEBSITE: {
    name: "自社サイト",
    short: "サイト",
    href: "/guide/opening-order",
    measure: ["検索からの訪問数", "サイト経由の予約・問い合わせ数", "滞在時間"],
    alternative: "Googleビジネスプロフィールと予約ページ（無料プラン）で、検索の受け皿を作る。",
    review_points: ["更新が止まっていないか", "予約・問い合わせの導線が1タップで分かるか", "スマホで崩れていないか"],
    next_action: {
      NEXT: "伝えたいこと3つと予約導線を決め、1ページで作る。",
      LATER: "Googleビジネスプロフィールを整えたあと、伝えたい内容が固まってから作る。",
      REVIEW_EXISTING: "更新・導線・スマホ表示の3点を見直す。",
    },
  },
  INTEGRATION: {
    name: "サービス間の連携",
    short: "連携",
    href: "/guide/opening-order",
    measure: ["二重入力の回数", "転記ミスの件数", "締め作業の時間"],
    alternative: "二重入力している項目を書き出しておき、次に見直すときに連携から検討する。",
    review_points: [],
    next_action: {
      NEXT: "二重入力している項目を書き出し、既製サービス同士の連携で消せるものから試す。",
      LATER: "二重入力している項目を書き出しておき、次の見直し時に連携から検討する。",
    },
  },
};

/* ------------------------------------------------------------------ */
/* ステータス表示                                                        */
/* ------------------------------------------------------------------ */

export interface StatusMeta {
  label: string;
  short: string;
  description: string;
}

export const STATUS_META: Record<Status, StatusMeta> = {
  FREE_FOUNDATION: {
    label: "無料で先に整える",
    short: "無料",
    description: "費用ゼロで、どの業態でも先に整えて損がない土台です。",
  },
  NOW: {
    label: "今、整える",
    short: "今",
    description: "いまのお店の条件なら、先に手を付ける価値が高いものです（最大3つ）。",
  },
  NEXT: {
    label: "次に考える",
    short: "次",
    description: "今すぐではないが、条件がそろえば検討する価値があるものです（最大2つ）。",
  },
  LATER: {
    label: "あとで考える",
    short: "あと",
    description: "今は動かなくてよいもの。状況が変わったら見直します。",
  },
  NOT_PRIORITY: {
    label: "今は優先しない",
    short: "今はいらない",
    description: "いまのお店の条件では、入れない判断で問題ないものです。",
  },
  REVIEW_EXISTING: {
    label: "既存サービスの見直し",
    short: "見直し",
    description: "すでに使っているため新規導入は勧めません。使い方と費用対効果を見直す観点です。",
  },
  HIDDEN: { label: "", short: "", description: "" },
};

/* ------------------------------------------------------------------ */
/* 理由文の生成                                                          */
/* ------------------------------------------------------------------ */

/** 先頭の条件句。要因がなければ空文字（「。」だけが残らないように） */
const lead = (x: string): string => (x ? `${x}。` : "");

const SENTENCE: Record<Area, Partial<Record<Status, (pos: string, neg: string) => string>>> = {
  GOOGLE_FOUNDATION: {
    FREE_FOUNDATION: () =>
      "店名や地域で検索されたときの受け皿です。無料で、どの業態でも先に整えて損がありません。",
  },
  RESERVATION: {
    NOW: (pos) =>
      `${pos}という条件がそろっています。受付・変更・リマインドを人の手だけで回すと、漏れや二重予約の負担が出やすい状態です。`,
    NEXT: (pos) =>
      `${lead(pos)}今すぐ有料のシステムを契約する必要はありませんが、無料プランで「本当に必要か」を試す価値はあります。`,
    LATER: (pos, neg) =>
      `${lead(neg || pos)}電話・LINE・DMで受けて困っていなければ、まだ急ぐ必要はありません。`,
    NOT_PRIORITY: (_pos, neg) =>
      `${neg}のため、予約システムより先に整えるものがあります。予約が増えてきたら見直してください。`,
  },
  CASHLESS: {
    NOW: (pos) =>
      `${pos}という条件です。手数料を払っても、会計の速さと現金管理の負担減で元が取れやすい状態です。`,
    NEXT: (pos) =>
      `${lead(pos)}要望が続くか、店頭決済が増えるかを見てから、固定費ゼロの候補で試す段階です。`,
    LATER: (pos, neg) => `${lead(neg || pos)}店頭決済が増えてきたら、そのときに試算すれば間に合います。`,
    NOT_PRIORITY: (_pos, neg) =>
      `${neg}ため、決済手数料を払う価値が出にくい状態です。請求・振込の方法を整えるほうが先です。`,
  },
  POS: {
    NOW: (pos) =>
      `${pos}という条件です。売上・在庫・担当別の集計を手作業で回すと、締め作業と転記の負担が大きくなります。`,
    NEXT: (pos) =>
      `${lead(pos)}高機能なPOSは不要でも、無料のレジアプリで売上記録だけ始める価値はあります。`,
    LATER: (pos, neg) => `${lead(neg || pos)}品目やスタッフが増えたら、そのときに見直せば十分です。`,
    NOT_PRIORITY: (_pos, neg) =>
      `${neg}ため、高機能なPOSは今は優先しません。無料のレジアプリか手書きで売上だけ記録すれば足ります。`,
  },
  LINE: {
    NOW: (pos) =>
      `${pos}という条件です。すでに接点のあるお客さまに、予約や再来の案内を届ける用途がはっきりしています。`,
    NEXT: (pos) =>
      `${lead(pos)}再来客が一定数ついてから、無料プランで始めて必要な通数を測る段階です。`,
    LATER: (pos, neg) =>
      `${lead(neg || pos)}開業前で顧客がほぼいない段階では、新規集客や営業準備のほうが先です。`,
    NOT_PRIORITY: (_pos, neg) =>
      `${neg}ため、再来の案内を送る相手が少ない状態です。無料でも運用の手間が先に立ちます。`,
  },
  EXTERNAL_PLATFORM: {
    NEXT: (pos) =>
      `${lead(pos)}新規客を早く増やしたい理由があるなら試す合理性がありますが、費用と依存度を先に決めてから動く段階です。`,
    LATER: (pos, neg) =>
      `${lead(neg || pos)}先にGoogleビジネスプロフィールと直接の導線を整え、新規客の不足が見えてから検討しても遅くありません。`,
    NOT_PRIORITY: (_pos, neg) =>
      `${neg}ため、新規集客にお金をかける段階ではありません。`,
  },
  ACCOUNTING: {
    NEXT: (pos) =>
      `${lead(pos)}開業後は帳簿と確定申告が必ず発生します。取引が増える前に記録の方法を決めておくと後が楽です。`,
    LATER: (pos) =>
      `${lead(pos)}帳簿の方法は開業30日前までに決めれば間に合います。まずは開業準備の優先事項を先に。`,
  },
  WEBSITE: {
    NEXT: (pos) =>
      `${pos}で、外部媒体も使っていません。検索から直接予約につなげる受け皿として、1ページでも検討する段階です。`,
    LATER: () =>
      "まずはGoogleビジネスプロフィールで検索の受け皿を作れば足りることが多いです。伝えたい内容や予約導線が固まってからで遅くありません。",
  },
  INTEGRATION: {
    NEXT: () =>
      "すでに3つ以上のサービスを使い、手作業の二重入力が発生しています。新しいサービスを足す前に、連携や入力の一本化を見直す段階です。",
  },
};

export function buildReasons(area: Area, status: Status, factors: Factor[]): string[] {
  const pos = joinPhrases(factors.filter((f) => f.weight > 0));
  const neg = joinPhrases(factors.filter((f) => f.weight < 0));
  const fn = SENTENCE[area][status];
  if (!fn) return [];
  return [fn(pos, neg)];
}

export function buildReviewReasons(area: Area, a: DiagnosisAnswers): string[] {
  const reasons = [
    `${AREA_META[area].name}はすでに導入済みのため、新規導入としては勧めません。`,
  ];
  if (area === "EXTERNAL_PLATFORM" && a.platform_dependency) {
    const dep = FACTOR_PHRASES.platform_dependency[a.platform_dependency];
    if (a.platform_dependency === "HIGH") {
      reasons.push(`${dep}です。媒体を止めたときに残る集客経路を、続けながら育てる段階です。`);
    } else if (a.platform_dependency === "UNKNOWN") {
      reasons.push(`${dep}です。続ける・減らすの前に、媒体関連費と媒体経由の新規数を出すのが先です。`);
    } else {
      reasons.push(`${dep}です。費用対効果（CAC・再来率）を定期的に出して判断してください。`);
    }
  }
  return reasons;
}
