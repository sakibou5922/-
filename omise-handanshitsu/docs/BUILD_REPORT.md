# ビルド報告｜お店の判断室 v0.1 PREVIEW CANDIDATE

- 実装日: 2026-10-06
- 入力: `OMISE_HANDANSHITSU_PRODUCT_ENGINEERING_CANDIDATE_v0.1_r01.zip`（`docs/spec/` に取り込み。元 config は `docs/spec/config/`、改変後は `config/`）
- 状態: 公開承認前。`config/features.json` の全フラグ false、`config/brand.json` の `public_release` false
- 技術: Next.js 16 / React 19 / TypeScript / 通常 CSS / Vitest / Playwright + axe-core

## 検証結果（最終ビルド）

| 検証 | 結果 |
|---|---|
| `tsc --noEmit` | PASS |
| `vitest run` | 5 ファイル / 62 件 PASS（うち 1 件は 5,832 通りの全組み合わせ不変条件） |
| `next build` | PASS（18 ルート。記事 5 本は SSG + ISR 1h、結果ページと API は dynamic） |
| SEO 基本（`qa:seo`） | 15 ページ問題 0。title/description/canonical 一意、JSON-LD 有効、結果ページ noindex、sitemap 14 URL、robots に Sitemap 行 |
| 内部リンク（`qa:links`） | 19 ページ・リンク切れ 0・外部リンク 0（記事本文に外部 URL を置かない） |
| 3 幅スクショ（`qa:screens`） | 9 ページ × 375/768/1440 = 27 枚、横はみ出し 0 |
| axe-core WCAG 2.1 AA（`qa:axe`） | 9 ページ × 375/1440、違反 0（初回はコントラスト 18 件 → 配色トークンを暗くして解消。すべて 4.5:1 以上を計算で確認） |
| Lighthouse（モバイル・最終ビルド） | TOP 98/100/96/66、記事 89/100/96/66、チェック 95/100/96/66、結果 92/100/96/63（Perf/A11y/BP/SEO）。CLS は全ページ 0.001（チェックページは 1 問目を静的 HTML に含める形に変更して 0.108 → 0.001）。SEO 減点は公開前の `noindex` と robots 全拒否（`is-crawlable`）によるもので、公開フラグ ON で解消 |
| E2E（Playwright） | 記事ミニチェック → 候補表示（Need 確定時のみ）→ 事前入力つき 8問（入力済み 2 問をスキップ）→ 確認 → 「直す」で 1 問だけ直して確認へ直帰（条件付き質問の消滅も反映）→ 結果（from= 付き・保存なし）→ 「回答を直す」→ 「最初からやり直す」で白紙、まで PASS |

## 受入基準 A01〜A25

| ID | 判定 | 根拠 |
|---|---|---|
| A01 同一入力+同一ルール版 → 同一結果 | PASS | `tests/engine.test.ts` 決定論・ハッシュ一致。API 3 回 POST で同一 `input_hash` |
| A02 Affiliate 状態が Need 決定を変えない | PASS | エンジンはフラグ/Offer を import しない（テストで検査）。API に `affiliate` 等を注入しても結果不変 |
| A03 全 Affiliate 無効でも価値が成立 | PASS | 現状がその状態。結果ページに `rel=sponsored` 0 件、公式リンクのみ |
| A04 NOW ≤3 / NEXT ≤2 | PASS | 上限超過は点数順で繰り下げ、理由文を付加（全組み合わせテスト） |
| A05 既存サービスを新規導入として勧めない | PASS | 既存は常に REVIEW_EXISTING（全組み合わせテスト） |
| A06 飛び込み中心 → 予約 NOT_PRIORITY | PASS | ハードルール + テスト |
| A07 ひとり+単純 → POS NOT_PRIORITY | PASS | 同上 |
| A08 店頭決済ほぼなし → キャッシュレス NOT_PRIORITY | PASS | 同上 |
| A09 開業前に LINE は NOW にならない | PASS | `line_now_requires_operating` + 全組み合わせテスト |
| A10 外部媒体は業種だけで NOW にならない | PASS | NEXT が上限（全組み合わせテスト） |
| A11 連携は前提（既存≥3 かつ 二重入力 YES）以外 HIDDEN | PASS | テスト |
| A12 未確認/期限切れ Offer 非表示 | PASS（解釈を明示） | EXPIRED は常に非表示。UNVERIFIED/PAUSED は `official_fallback: true` のときだけ公式リンクのカードとして表示（freee予約・Square）。freee会計は非表示。収益リンクは ACTIVE+APPROVED のみ |
| A13 公式フォールバック | PASS | フラグ OFF で全候補が公式 URL・PR なし |
| A14 Affiliate リンクは sponsored | PASS | `OutboundLink` が `sponsored` のときだけ `rel="sponsored noopener noreferrer"`。sponsored と href は同一条件で決まる |
| A15 freee Starter を有料へ押し上げずに勧められる | PASS | 候補カードに Starter 0 円、向かない人に「Starterで足りる…」、記事に明記 |
| A16 各記事に 即答・向く/向かない・代替・次の行動 | PASS | `tests/content.test.ts` |
| A17 Affiliate 削除後も記事に価値 | PASS | 記事本文に外部 URL・ASP パラメータなし（テスト） |
| A18 固有名の数値 claim は根拠付き | PASS | ブランド名＋数字を含む costFact は sources と fallback 必須（テスト） |
| A19 料金に verified_at | PASS | 根拠台帳 12 件・Offer 7 件すべて 2026-10-06。UI に最終確認日を表示 |
| A20 期限切れ material fact は収益 claim をブロック | PASS | 個別 Offer の鮮度に加え、台帳のどれか 1 件でも期限切れならサイト全体で収益リンク停止（`monetizationBlocked` を `monetizable` に接続、テスト） |
| A21 モバイル + キーボード完結 | PASS | ネイティブ radio/checkbox + label、fieldset/legend、見出しへフォーカス移動、44px タップ領域、axe 0 件、はみ出し 0 |
| A22 PII 不要 | PASS | 入力は選択肢と計算機の数値のみ。回答は URL のみ・保存なし・計測に回答やハッシュを送らない |
| A23 typecheck/test/build PASS | PASS | 上表 |
| A24 sitemap/robots/canonical 有効 | PASS | ルートの canonical と sitemap を末尾スラッシュなしで統一 |
| A25 Affiliate カードは判断結果より視覚的に下位 | PASS | 結果ページは判断 5 群 → 回答確認 → 候補の順。候補カードは影なし・淡色・小さめ |

## レビュー反映（コードレビュー / QA 部 / デザイン部）

- **/code-review high（10 件 → 10 件対応）**: 診断完了時に回答を sessionStorage へ残さない／「最初からやり直す」で事前入力も破棄（`?reset=1`）／要因ゼロの理由文が「。」で始まる不具合／未知値だけの既存サービスを空配列に潰さず拒否／「直す」後は確認画面へ直帰／dataLayer へ回答ハッシュを送らない／広告方針ページの判定を `monetizable()` に統一／ミニチェック定義を `minichecks.ts` に分離し記事本文をクライアントに同梱しない／API の二重パース除去／QA スクリプトの BASE_URL 末尾スラッシュ／A20 のサイト全体ブロック接続。
- **QA 部（7 件 → 6 件対応・1 件は情報）**: A12 の解釈（`official_fallback`）／A20 の全体ブロック／INTEGRATION が LATER に繰り下がった際の次の行動・代替文／ルート canonical と sitemap の統一／記事のスティッキー CTA をコアチェック入口（`/check?from=領域`）へ変更／`offer.schema.json` を実データに合わせテストで検証。
- **デザイン部（10 件 → 9 件対応）**: 見出し用明朝 Noto Serif JP を next/font で自己ホスト（Android でも編集物らしい見出し）／ヒーローの淡いグラデーションと sticky CTA のぼかしを撤去（brief の Avoid）／確認画面ボタンを 44px／ホームと記事一覧のカード見出しから「は本当に必要？」の重複を除去／結果ページの候補の定型文を 1 回に／「気になっていたもの」を状態バッジと別の見た目に／スマホのヘッダーを低く・パンくず末尾を非表示／チェックページを 1 軸に揃え 1 問目を上へ／3 段ビジュアルの「否」を「未」に／「考え方」を 3 カードから罫線付き定義リストへ／ピル角丸を 6px に。未対応: 候補カードを `<details>` で畳む案（offer_impression 計測への影響を避けるため見送り）。
- **/security-review**: HIGH / MEDIUM の指摘なし。URL・POST・sessionStorage 由来の値はすべて固定の列挙値に照合してから使われ、`dangerouslySetInnerHTML`（JSON-LD）には静的データしか届かない、外部リンクは `rel="noopener noreferrer"`、API はスタックトレースを返さない、秘密情報の混入なし、と確認。防御強化の指摘として CSP / HSTS 未設定があり、HSTS は `next.config.ts` に追加（CSP は Next.js のインラインスクリプトに nonce が必要なため公開時の課題として残す）。
- **/simplify（4 観点のレビュー約 60 件 → 重複除去後 35 件を反映）**: ハードルール（NOT_PRIORITY 条件・上限ステータス）と領域一覧を `config/decision.rules.json` のデータに移し、エンジンの領域別コピペを 1 つのループに（会計・自社サイトも点数表へ）。結果ページの 5 群を `ResultGroup` 1 つに、記事カードを `ArticleCard` に共通化。ウィザードの派生状態（確認画面フラグ・読込中フラグ）を削除し radio/checkbox 分岐を統合。ミニチェック定義・事前入力・日付整形を依存ゼロの小モジュールに分け、記事ページが CheckWizard や根拠台帳をクライアントに同梱しないように。`sitemap`/`robots`/JSON-LD を `src/lib/seo.ts` の純粋関数へ。Offer の一覧可否を `isListed()` に集約し、サイト全体ブロックの判定を領域ごとに 1 回へ。明朝 Web フォントを 700 のみに（CSS 約 67KB→33KB gz）。未使用の CSS・フィールド・再エクスポートを削除。見送り: Offer モデルの program サブオブジェクト化、ステータス色トークンの CSS 統合、記事 href の labels からの参照（クライアント同梱が増えるため）。

## 仕様からの逸脱・判断（要確認）

1. **スタック**: 仕様 08 の既定スタックは Laravel + React/Vite だが、開発方針（新規は TypeScript + Next.js、通常 CSS）に従い Next.js で実装。判断エンジンは純粋 TS モジュール＋JSON ルール（`config/decision.rules.json`）で、Laravel の正式エンドポイントへ移植可能な構造。
2. **点数未定義の領域**: 仕様 03 に点数定義がない ACCOUNTING / WEBSITE / INTEGRATION は v0.1 暫定ルール（`config/decision.rules.json` の `engineering_defaults`）。会計は開業 30 日前〜営業中で NEXT、自社サイトは営業中・新規客不足・外部媒体なしで NEXT、連携は既存≥3＋二重入力 YES で NEXT。
3. **A12 の解釈**: 「UNVERIFIED Offer 表示禁止」と A13/A15（freee Starter を勧められる）が衝突するため、`status` を収益プログラムの状態と定義し、`official_fallback` で公式リンク表示の可否を明示。仕様側の文言更新を推奨。
4. **記事のスティッキー CTA**: brief「sticky CTA はコアチェック入口のみ」に合わせ、記事の下部固定 CTA は `/check?from=<領域>` へ。
5. **結果グループ 4**: LATER（あとで考える）を「今は優先しない・あとで考える」の群に同居させ、ラベルで区別。
6. **キャッシュレス記事の「Square 2.5%〜」**: 草稿にあった料率は根拠台帳に無いため記載せず、「条件で変わるため最新確認」に置換。
7. **Lighthouse SEO 66**: 公開前の noindex / robots 全拒否が原因。`public_release_enabled` と `brand.public_release` を true にすると解消する。

## 公開前に人が行うこと（10_BRAND_CLEARANCE_NOTE）

商標（J-PlatPat）・ドメイン・SNS handle の確認、ASP / Partner の申請と `config/offers.json` の `smask_enrollment` / `affiliate_url` 更新、`/operator` の所在地・連絡先、`config/brand.json` `site_url` の実ドメイン化、フラグ ON。根拠台帳は 30 日ごと（料金）に `verified_at` を更新しないと数値が自動で非表示になる。
