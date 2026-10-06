/**
 * 「本当に必要？」記事 5本（04_CONTENT_MATRIX.md / content_drafts）。
 * 各記事は 即答・向く/向かない・代替・次の行動 を必ず持つ（A16）。
 * 固有名の数値 claim は sources に根拠 id を持ち、鮮度切れなら表示しない（A18〜A20）。
 */
import type { Area } from "../decision/types";

export interface CostFact {
  text: string;
  /** 根拠 id（config/evidence.registry.json）。空なら一般論 */
  sources: string[];
  /** 鮮度切れ時の差し替え文 */
  fallback?: string;
}

export interface DecisionRow {
  state: string;
  label: string;
  fit: string;
  action: string;
}

export interface Article {
  slug: string;
  area: Area;
  title: string;
  shortTitle: string;
  /** 一覧カードの見出し（サービス名） */
  subject: string;
  description: string;
  /** 検索で入ってくる質問文 */
  question: string;
  keywords: string[];
  publishedAt: string;
  reviewedAt: string;
  immediateAnswer: string[];
  whyUsed: string[];
  costIntro: string;
  costFacts: CostFact[];
  risk: string[];
  decisionRows: DecisionRow[];
  alternative: string[];
  nextAction: string[];
  /** Offer カードの前に置く免責文 */
  offerNote: string;
  related: string[];
}

/* ------------------------------------------------------------------ */

const hotpepper: Article = {
  slug: "hotpepper-beauty",
  subject: "ホットペッパービューティー",
  area: "EXTERNAL_PLATFORM",
  title: "ホットペッパービューティーは本当に必要？掲載する店・しない店の判断基準",
  shortTitle: "ホットペッパービューティーは本当に必要？",
  description:
    "HOT PEPPER Beautyはすべてのサロンに必須ではありません。新規客の必要性・依存度・獲得単価・再来率の4点で、掲載する店としない店を判断する基準をまとめました。",
  question: "ホットペッパービューティー、うちの店に本当に必要？",
  keywords: ["ホットペッパービューティー 必要", "ホットペッパービューティー 掲載 判断", "ホットペッパー 依存", "サロン 集客媒体"],
  publishedAt: "2026-10-06",
  reviewedAt: "2026-10-06",
  immediateAnswer: [
    "すべてのサロンに必須ではありません。開業直後で認知がなく、新規客を早く獲得したい店には強い選択肢になり得ます。",
    "判断したいのは「掲載するか」だけではありません。何のために使うか、1人獲得するのにいくら払うか、来店後に再来しているか、媒体以外の集客経路が育っているか、まで見て初めて自店に合うか判断できます。",
  ],
  whyUsed: [
    "利用者は、検索・空席確認・口コミ・予約まで一つのサービス内で進められます。店舗側も予約・顧客・売上などを管理する仕組みを利用できます。",
    "つまり「すでに人が集まっている場所」と「予約運用」がまとまっているのが強みです。開業直後に自力で集客経路を作るより、立ち上がりが早いことがあります。",
  ],
  costIntro: "「月額が高い」だけでは判断できません。自店の実額で計算します。",
  costFacts: [
    {
      text: "掲載費は一律の公開価格ではなく、掲載は問い合わせ方式です。個別に確認する必要があります。",
      sources: ["HPB_LISTING"],
      fallback: "掲載費の案内方式は最終確認から日が経っています。公式サイトで再確認してください。",
    },
    {
      text: "利用約款上、対象となるネット予約について共通ネット予約利用料1%が定められています。",
      sources: ["HPB_TERMS"],
      fallback: "ネット予約利用料の条件は最終確認から日が経っています。最新の利用約款で再確認してください。",
    },
    {
      text: "まず計算するのは「月間の媒体関連費 ÷ 媒体経由の新規来店数 ＝ 新規1人あたり獲得費（CAC）」です。ただしCACが低ければ終わりではなく、初回で終わるのか半年で何回来てくれるのかでも価値は変わります。",
      sources: [],
    },
  ],
  risk: [
    "媒体経由の新規客が多いこと自体は悪くありません。問題は、その媒体を止めたときに他の集客経路がほぼ残らない状態かどうかです。",
    "確認したいのは、Google・店名検索・直接予約・LINE・紹介・自社Webなど、媒体以外の経路がどれだけあるかです。",
  ],
  decisionRows: [
    { state: "USE_OR_TEST", label: "使う・試す", fit: "開業直後で新規客が必要。直接集客がまだ弱い。", action: "月に払える上限を決めて試す。" },
    { state: "USE_AND_BUILD_OWN", label: "使いながら自前の導線を育てる", fit: "成果は出ているが、依存度が高い。", action: "続けながらGoogle・直接予約・紹介を育てる。" },
    { state: "MEASURE_FIRST", label: "まず数字を出す", fit: "費用・新規客数・再来率を把握していない。", action: "解約・継続より先に3〜6か月の数字を出す。" },
    { state: "LOW_PRIORITY", label: "優先度は低い", fit: "紹介や直接予約で十分稼働し、追加集客の必要性が低い。", action: "受け入れ余力ができたら再検討。" },
  ],
  alternative: [
    "「使わない」で終わらせず、発見・信頼・予約・再来を何で代替するかを決めます。",
    "Googleビジネスプロフィールでは、条件に応じて予約リンクなどを掲載できます。店名検索の受け皿を無料で整えるのが先です。",
  ],
  nextAction: [
    "直近3〜6か月の媒体関連費・新規客数・再来率を出してください。数字が分からないなら、まずそこが最優先です。",
  ],
  offerNote: "この記事に収益リンクはありません。掲載の問い合わせは公式サイトから行ってください。",
  related: ["reservation-system", "line-official"],
};

const reservation: Article = {
  slug: "reservation-system",
  subject: "予約システム",
  area: "RESERVATION",
  title: "予約システムは本当に必要？LINE・電話・DMで十分な店との違い",
  shortTitle: "予約システムは本当に必要？",
  description:
    "予約件数が少なく受付経路が一つなら、有料の予約システムを急ぐ必要はありません。営業時間外・複数経路・複数スタッフ・予約漏れの4点で、手動で十分な店とシステム化する価値がある店を分けます。",
  question: "予約システム、電話とLINEで足りてるけど本当に必要？",
  keywords: ["予約システム 必要", "予約システム いらない", "予約管理 LINE 電話", "小規模店舗 予約"],
  publishedAt: "2026-10-06",
  reviewedAt: "2026-10-06",
  immediateAnswer: [
    "予約件数が少なく、受付経路が一つで、1人で問題なく管理できているなら、有料の予約システムを急ぐ必要はありません。",
    "一方、営業時間外の予約、複数の受付経路、複数スタッフ、予約漏れや二重予約が負担になっているなら、システム化する価値が高くなります。",
  ],
  whyUsed: [
    "「予約を受ける」と「予約を管理する」は別です。電話・LINE・Instagram DMでも予約は受けられます。",
    "問題は、変更・キャンセル・空き枠・スタッフ間の共有・リマインドまで人が処理することです。件数と経路が増えるほど、この処理が負担になります。",
  ],
  costIntro: "無料から試せるため、「システムが必要か」の検証にも使えます。",
  costFacts: [
    {
      text: "freee予約には Starter 0円 の現行プランがあります。予約サイト作成・予約管理などを試せます。",
      sources: ["FREEE_RES_PRICE"],
      fallback: "freee予約の無料プランの条件は最終確認から日が経っています。公式サイトで再確認してください。",
    },
    {
      text: "顧客管理・予約時アンケート・メールのカスタマイズなどが必要になったら、有料機能の価値を確認します。Businessの現行料金は年払い3,180円/月、月払い3,980円/月です。",
      sources: ["FREEE_RES_PRICE"],
      fallback: "有料プランの料金は最終確認から日が経っています。公式サイトで再確認してください。",
    },
  ],
  risk: [
    "有料プランにしても、受付経路が電話・LINE・DMのまま分散していれば、台帳が二重になって手間は減りません。経路をどこに寄せるかを先に決めます。",
    "本サイトの収益ルール：freee予約の紹介制度には有料Business契約時の報酬がありますが、Starterで十分な人を有料へ誘導しません。",
  ],
  decisionRows: [
    { state: "MANUAL_OK", label: "手動で十分", fit: "予約が少ない・経路が一つ・1人運営・営業時間外対応が苦にならない・漏れが起きていない。", action: "今の方法を続け、漏れが出たら見直す。" },
    { state: "FREE_STARTER_FIT", label: "無料プランで試す", fit: "営業時間外の予約が欲しい、または経路が増えてきた。", action: "無料プランで予約ページだけ作り、1か月見る。" },
    { state: "SYSTEM_RECOMMENDED", label: "システム化する価値が高い", fit: "複数スタッフ・複数経路・漏れや二重予約が起きている。", action: "受付経路を寄せ、リマインドと空き枠を自動化する。" },
    { state: "INTEGRATION_REVIEW", label: "経路の一本化・連携を見直す", fit: "経路が分散し、漏れが出ていて、スタッフも複数。", action: "新規導入の前に、受付経路の一本化と既存ツールの連携を見直す。" },
  ],
  alternative: [
    "電話・LINE・DMで受け、紙かスプレッドシートの台帳で管理します。受付経路を1つに決めるだけでも、漏れは減ります。",
    "Googleビジネスプロフィールに電話番号と営業時間を正しく載せれば、検索からの予約は受けられます。",
  ],
  nextAction: ["直近1週間の予約受付に何分使ったか、何経路から予約が来たかを数えてください。"],
  offerNote: "Starterで十分な人を有料へ誘導しません。紹介制度が有効なときだけ PR 表示を付けます。",
  related: ["line-official", "hotpepper-beauty"],
};

const pos: Article = {
  slug: "pos-register",
  subject: "POSレジ",
  area: "POS",
  title: "POSレジは本当に必要？小さなお店で入れる店・まだ不要な店",
  shortTitle: "POSレジは本当に必要？",
  description:
    "POSは「店を開くなら必要な高性能レジ」ではありません。在庫・商品数・スタッフ・売上分析・連携の5点で、入れる店とまだ不要な店を分け、無料POSという選択肢も含めて判断します。",
  question: "POSレジって、小さな店でも入れないとダメ？",
  keywords: ["POSレジ 必要", "POSレジ いらない", "小さなお店 レジ", "無料 POS"],
  publishedAt: "2026-10-06",
  reviewedAt: "2026-10-06",
  immediateAnswer: [
    "POSは「店を開くなら必要な高性能レジ」ではありません。在庫・商品数・スタッフ・売上分析・決済や会計との連携が複雑になったときに価値が出ます。",
    "メニューが少なく、在庫管理が不要で、1人運営なら、高度なPOS機能の優先度は低い場合があります。",
  ],
  whyUsed: [
    "売上の記録・集計、商品別・担当別の分析、在庫の増減、決済や会計ソフトへの連携を、締め作業のたびに人がやらなくて済むようになります。",
    "逆に言えば、これらが発生していない店では、POSの価値はまだ出ていません。",
  ],
  costIntro: "「POSを導入するか」と「高額なPOSを契約するか」は別の判断です。",
  costFacts: [
    {
      text: "Square POSレジアプリは現在無料で、決済端末は別費用です（Reader 4,980円、Stand 29,980円、Terminal 39,980円）。",
      sources: ["SQUARE_POS"],
      fallback: "Square の料金は最終確認から日が経っています。公式サイトで再確認してください。",
    },
    {
      text: "Airレジもアプリ・初期費用・月額・基本サポートが0円で、必要な周辺機器は別途です。",
      sources: ["AIRREGI"],
      fallback: "Airレジの料金は最終確認から日が経っています。公式サイトで再確認してください。",
    },
  ],
  risk: [
    "周辺機器（iPad・プリンター・ドロアー）の費用と、将来の決済・会計連携の範囲を先に確認しないと、「無料で始めたのに後から足す」ことになります。",
    "比較方針：Squareだけを出しません。Affiliate対象でなくてもAirレジなどの公式の選択肢を出し、適合条件で比較します。",
  ],
  decisionRows: [
    { state: "SIMPLE_REGISTER_OK", label: "簡易なレジで十分", fit: "メニューが少ない・在庫なし・1人運営。", action: "無料レジアプリか手書き伝票＋表計算で売上だけ記録。" },
    { state: "FREE_POS_FIT", label: "無料POSで始める", fit: "売上記録を楽にしたいが、高度な機能は不要。", action: "無料POSアプリで商品登録し、締め作業の時間を測る。" },
    { state: "ADVANCED_POS_FIT", label: "高機能POSの価値がある", fit: "在庫が重要・品目が多い・複数スタッフ・分析したい。", action: "在庫と分析の要件を書き出し、連携範囲で選ぶ。" },
    { state: "INTEGRATION_REVIEW", label: "連携を前提に選ぶ", fit: "キャッシュレスや会計と連携したい。", action: "連携先を先に決め、対応するPOSから選ぶ。" },
  ],
  alternative: [
    "無料のレジアプリか、手書き伝票＋表計算で売上だけ記録します。締め作業に時間がかかり始めたら、そのときにPOSを検討すれば十分です。",
  ],
  nextAction: ["商品・メニュー数と在庫の管理方法を書き出し、締め作業に毎日何分かかっているかを1週間測ってください。"],
  offerNote: "必要性が確定したあとだけ候補を出します。収益リンクが有効なときだけ PR 表示を付け、公式の選択肢も同じ条件で並べます。",
  related: ["cashless-payment", "reservation-system"],
};

const cashless: Article = {
  slug: "cashless-payment",
  subject: "キャッシュレス決済",
  area: "CASHLESS",
  title: "キャッシュレス決済は本当に必要？手数料を払う価値がある店・ない店",
  shortTitle: "キャッシュレス決済は本当に必要？",
  description:
    "「今どき必須」でも「手数料がもったいない」でも決めません。店頭決済の多さ・客層の要望・客単価・月間店頭売上・現金管理の負荷から、手数料を払う価値がある店とない店を分けます。",
  question: "キャッシュレス決済、手数料を払ってまで入れる価値ある？",
  keywords: ["キャッシュレス 必要", "キャッシュレス 手数料 もったいない", "小さなお店 キャッシュレス", "決済 導入 判断"],
  publishedAt: "2026-10-06",
  reviewedAt: "2026-10-06",
  immediateAnswer: [
    "「今どき必須」だけでも「手数料がもったいない」だけでも決めません。客層、店頭決済の多さ、客単価、粗利、現金管理の負荷から判断します。",
    "店頭決済がほぼない店（請求書・振込・月謝中心）では、優先度は低くなります。",
  ],
  whyUsed: [
    "お客さまが「カードが使えないなら別の店へ」となる機会損失を防ぎ、会計を速くし、現金の締め作業と釣り銭の管理を減らすためです。",
    "逆に、店頭決済がほぼ発生しない店では、これらの価値はほとんど出ません。",
  ],
  costIntro: "月の実コストは「キャッシュレス売上 × 決済手数料率 ＋ 月額固定費」で計算します。下の計算機で試算できます。",
  costFacts: [
    {
      text: "料率は提供会社・ブランド・審査・プログラム条件で異なります。必ず自店に適用される最新の条件で計算してください。",
      sources: [],
    },
    {
      text: "SquareはPOSレジアプリが無料で、決済端末は別費用です。決済料率は条件により変わるため最新確認が必要です。",
      sources: ["SQUARE_POS"],
      fallback: "Square の料金は最終確認から日が経っています。公式サイトで再確認してください。",
    },
    {
      text: "Airペイは初期費用・使用料・月額・振込手数料0円の現行案内があり、別途決済手数料が発生します。",
      sources: ["AIRPAY"],
      fallback: "Airペイの料金は最終確認から日が経っています。公式サイトで再確認してください。",
    },
  ],
  risk: [
    "入金サイクルが資金繰りに合うかを先に確認します。現金なら当日、キャッシュレスなら数日〜のずれが出ます。",
    "「手数料率が低い」だけで選ぶと、対応ブランドや端末費で後から差が出ます。",
  ],
  decisionRows: [
    { state: "HIGH_FIT", label: "導入価値が高い", fit: "店頭決済が多い・要望がある・客単価が高め・現金管理の負荷が大きい。", action: "手数料を試算し、固定費ゼロの候補から比較。" },
    { state: "CONDITIONAL", label: "条件付き", fit: "店頭決済はあるが、要望や負荷はまだ小さい。", action: "要望を1か月記録し、続くなら試す。" },
    { state: "LOW_PRIORITY", label: "優先度は低い", fit: "店頭決済がほぼない・請求書/振込中心・顧客不便が確認できない。", action: "今は入れない。請求・振込の方法を整える。" },
  ],
  alternative: [
    "現金と振込で受け、「カード使える？」と聞かれた回数を記録します。要望が月に何件も続くなら、そのときに固定費ゼロの候補で試せば遅くありません。",
  ],
  nextAction: ["月の店頭売上の想定額と、想定される料率で手数料を試算してください。粗利に対して許容できるかで決めます。"],
  offerNote: "必要性が確定したあとだけ、収益リンクの候補と公式の候補を同じ条件で並べます。収益リンクが有効なときだけ PR 表示を付けます。",
  related: ["pos-register", "reservation-system"],
};

const line: Article = {
  slug: "line-official",
  subject: "LINE公式アカウント",
  area: "LINE",
  title: "LINE公式アカウントは本当に必要？小さなお店が作る前に考えたいこと",
  shortTitle: "LINE公式アカウントは本当に必要？",
  description:
    "無料だから作るのではなく、再来・通知・予約導線など明確な用途があるなら作る。開業前で顧客がほぼいない状態では、新規集客より先にすべきとは限りません。作る前に考える5点をまとめました。",
  question: "LINE公式アカウント、無料だしとりあえず作るべき？",
  keywords: ["LINE公式アカウント 必要", "LINE公式 いらない", "LINE公式 小さなお店", "LINE公式 料金"],
  publishedAt: "2026-10-06",
  reviewedAt: "2026-10-06",
  immediateAnswer: [
    "無料だから作るのではなく、再来・通知・予約導線など明確な用途があるなら作る、が答えです。",
    "開業前で顧客がほぼいない状態では、新規集客や営業準備より先にすべきとは限りません。",
  ],
  whyUsed: [
    "LINEが得意なのは、すでに接点のあるお客さまとの継続的な接点を作ることです。再来の案内・予約の確認・お知らせが届きやすくなります。",
    "新規集客の媒体と、再来のための施策を混同しないことが大切です。LINEは後者です。",
  ],
  costIntro: "無料で足りるかを先に見ます。「友だち数 × 月の配信回数」から必要な通数を概算します。",
  costFacts: [
    {
      text: "LINE公式アカウントは、コミュニケーション 0円/200通、ライト 5,000円（税別）/5,000通、スタンダード 15,000円（税別）/30,000通 の現行案内です。",
      sources: ["LINE_PLAN"],
      fallback: "LINE公式アカウントの料金は最終確認から日が経っています。公式サイトで再確認してください。",
    },
    {
      text: "2026年10月1日に追加メッセージの料金改定があります。従量部分の条件は最新を確認してください。",
      sources: ["LINE_PLAN_CHANGE"],
      fallback: "追加メッセージの料金条件は最終確認から日が経っています。公式サイトで再確認してください。",
    },
    {
      text: "ただし、配信できるから価値があるわけではありません。何を送り、どの行動につなげるかを先に決めます。",
      sources: [],
    },
  ],
  risk: [
    "目的と担当が決まっていないまま始めると、配信が止まり、ブロックだけ増えます。",
    "LINEを予約窓口にしたい場合、予約システムと組み合わせる選択肢もあります。LINEを作っただけで予約管理の問題が解決するとは限りません。",
  ],
  decisionRows: [
    { state: "START_FREE", label: "無料で小さく始める", fit: "再来はあるが、目的や担当がまだ曖昧。", action: "無料プランで作り、「何を・誰に・月何回」を決めてから案内。" },
    { state: "USE_WITH_PURPOSE", label: "目的を決めて使う", fit: "再来が中心で、送る内容と担当が決まっている。", action: "予約・再来につなげる配信だけに絞って運用。" },
    { state: "SCALE_AFTER_VALUE", label: "成果が出てから広げる", fit: "顧客数が多く、無料枠を超えそう。", action: "予約・再来への効果を測ってから有料プランへ。" },
    { state: "NOT_PRIORITY", label: "今は優先しない", fit: "再来が少ない、または顧客がまだいない。", action: "まず来店客を増やし、再来客が見えたら作る。" },
  ],
  alternative: [
    "再来のお礼や次回予約の案内は、会計時の一言と名刺・ショップカードで十分なことが多いです。再来客が見えてきてから作っても遅くありません。",
  ],
  nextAction: ["友だち数の見込み × 月の配信回数で必要通数を出し、送る内容を1つ決めてください。決まらないなら、まだ作る段階ではありません。"],
  offerNote: "この記事に収益リンクはありません。開設は公式サイトから行ってください。",
  related: ["reservation-system", "hotpepper-beauty"],
};

export const ARTICLES: Article[] = [hotpepper, reservation, pos, cashless, line];

export function getArticle(slug: string): Article | undefined {
  return ARTICLES.find((a) => a.slug === slug);
}

export function articleHref(slug: string): string {
  return `/need/${slug}`;
}
