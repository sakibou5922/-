# スキル早見表との対応（このビルドで何を使ったか）

依頼「このすべてのスキル使って構築してください」に対し、スキル早見表（skills-guide.html）の各分類を、
このクラウドセッションで **実際に使えたもの** と、**同等の作業を手動／自作スクリプトで代替したもの**、**この環境には無く未適用のもの** に分けて記録します。

| 早見表の分類 | 早見表のスキル | 本ビルドでの扱い | 成果物 |
|---|---|---|---|
| 開発の進め方 | superpowers:brainstorming / writing-plans / executing-plans | 未導入。代わりに仕様 13 本を読み込み → 層分割（判断エンジン / Offer / 根拠）→ 実装 → 検証の順で進行 | `CLAUDE.md` の Architecture |
| 開発の進め方 | superpowers:test-driven-development / verification-before-completion | 受入基準 A01〜A24 をテストに落とし込み、全組み合わせ（5,832 通り）の不変条件テストを追加。完了前に typecheck / test / build / QA を実行 | `tests/*.test.ts`（62 件） |
| 開発の進め方 | superpowers:subagent-driven-development / dispatching-parallel-agents | **使用**（Agent ツール）。QA 部・デザイン部に相当する 2 つのレビューを並列実行し、指摘 17 件を反映 | `docs/BUILD_REPORT.md` の「レビュー反映」 |
| Claude Code 標準 | /init | **使用**。`CLAUDE.md` を 2 段（リポジトリ直下・プロジェクト直下）で作成 | `CLAUDE.md`, `omise-handanshitsu/CLAUDE.md` |
| Claude Code 標準 | /code-review high | **使用**。10 件の指摘（sessionStorage 残留、理由文の先頭「。」、未知値の空配列化、dataLayer へのハッシュ送信 など）をすべて修正 | 同上 |
| Claude Code 標準 | /security-review | **使用**。結果は `docs/BUILD_REPORT.md` | 同上 |
| Claude Code 標準 | /simplify | **使用**。結果は `docs/BUILD_REPORT.md` | 同上 |
| Claude Code 標準 | /run | 本番ビルドを `next start` で起動し、curl / Playwright で動作確認 | `docs/qa/` |
| 部署エージェント | QA 部 | **使用**（サブエージェント）。A01〜A25 を敵対的に検証、欠陥 7 件 → 6 件修正・1 件は情報のみ | `docs/BUILD_REPORT.md` |
| 部署エージェント | デザイン部 | **使用**（サブエージェント）。12_VISUAL_DESIGN_BRIEF との照合、改善 10 件 → 9 件反映 | 同上 |
| 部署エージェント | 営業部・ディレクション部・企画マーケ部・開発部・保守運用部・バックオフィス部 | 今回の範囲外（見積・契約などの成果物は依頼に含まれないため未実行） | — |
| デザイン・サイト制作 | /hallmark, /design-taste-frontend, /high-end-visual-design, /minimalist-ui | 未導入。仕様 12 の Visual Design Brief（紙のような生成り・深緑・控えめな赤茶、明朝見出し、Decision Card 中心、ランキング/メダル/派手なグラデーション禁止）を通常 CSS で直接実装し、デザイン部レビューで「AI テンプレ感」を除去 | `src/app/globals.css` |
| デザインのレビュー | /design:design-critique, /design:accessibility-review | critique はサブエージェントで代替。アクセシビリティは axe-core（WCAG 2.1 AA）を自作スクリプトで実行し、コントラスト 18 件 → 0 件 | `scripts/axe.mjs`, `docs/qa/axe-report.json` |
| レスポンシブ・表示確認 | 3 つの幅でスクショ / はみ出しチェック / playwright-cli | Playwright で 375 / 768 / 1440 の全ページ撮影＋横はみ出し検出（0 件） | `scripts/screenshots.mjs`, `docs/qa/screenshots/` |
| サイト品質チェック | Lighthouse | **実行**（モバイル）。TOP: Perf 96 / A11y 100 / BP 96 / SEO 66（SEO は公開前の noindex・robots 全拒否が原因で、公開時に解消） | `docs/qa/lighthouse-summary.json` |
| サイト品質チェック | lychee（リンク切れ） | 内部クロールで代替（19 ページ・切れ 0） | `scripts/linkcheck.mjs` |
| サイト品質チェック | Unlighthouse / chrome-devtools / subfont / sharp | 未実行（画像を使わないサイトのため sharp は対象なし。フォントは Noto Serif JP を next/font で自己ホスト・サブセット化） | — |
| SEO | /seo page, /seo technical, /seo schema, /seo sitemap | title / description / canonical / JSON-LD（Organization, WebSite, Article, BreadcrumbList）/ noindex / sitemap / robots を自作スクリプトで検証（問題 0） | `scripts/seocheck.mjs`, `docs/qa/seo-report.json` |
| AEO | /aeokit:aeo-audit 等 | 未導入。構造化データと「結論を最初に書く」記事構成で代替 | 記事 5 本 |
| ネットで調べる | /agent-reach | 未使用。固有名の数値は仕様の根拠台帳（2026-10-06 検証済）のみを使用し、追加のウェブ調査は行わない方針（A18） | `config/evidence.registry.json` |
| セキュリティ監査 | Trail of Bits 各種（semgrep, codeql, insecure-defaults, supply-chain）| 未導入。/security-review で代替。依存は next / react / react-dom の 3 つのみ | — |
| 書類・資料 | docx / xlsx / pptx / pdf | 今回の成果物は Web サイトのため未使用 | — |
| 動画・画像生成 | HyperFrames / Tesseract / Remotion / HeyGen / Replicate | 対象外（仕様が「生成画像に文字を焼き込まない・写真を使わない」のため） | — |
| 開発方針（CLAUDE.md） | 新規は TypeScript + Next.js / 通常 CSS / Tailwind なし / 有料 API・新規アカウントなし | **遵守**。仕様 08 の既定スタック（Laravel + React/Vite）ではなく、開発方針に従い Next.js で実装。判断エンジンは純粋な TS モジュール＋JSON ルールなので Laravel へ移植可能 | `CLAUDE.md` |
