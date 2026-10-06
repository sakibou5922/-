# お店の判断室 — Product / Engineering Candidate v0.1

小さなお店・対面サービスの事業者が、予約システム・POS・キャッシュレス・LINE公式・外部集客媒体などについて
「本当に必要か／今必要か／何番目か／導入後に何を測るか」を判断できるようにするサイトの実装です。

- 状態: **PREVIEW CANDIDATE**（公開承認前。`config/features.json` のフラグはすべて `false`）
- 仕様: `docs/spec/`（00〜12 の Markdown、記事草稿、元の config）
- 受入基準: `docs/spec/09_ACCEPTANCE.md`（A01〜A25）。検証結果は `docs/BUILD_REPORT.md`

## 技術構成

TypeScript / Next.js 16（App Router）/ React 19 / 通常CSS（Tailwind なし）/ Vitest / Playwright + axe-core（QA用）。
有料 API・外部アカウント・外部計測 SDK は使っていません。

| 層 | 場所 | 役割 |
|---|---|---|
| 判断エンジン | `src/lib/decision/` + `config/decision.rules.json` | 8問＋条件付き3問 → 9領域を 無料/今/次/あと/優先しない/見直し に分類。決定論的・点数非表示・Affiliate 非参照 |
| Offer 層 | `src/lib/offers.ts` + `config/offers.json` | Need 確定領域にだけ候補。固定順。フラグ・ACTIVE・APPROVED・URL・鮮度のすべてを満たすときだけ収益リンク（fail closed） |
| 根拠・鮮度 | `src/lib/evidence.ts` + `config/evidence.registry.json` | 固有名の数値 claim は根拠 id 必須。30/90/90 日で期限切れ → 非表示 |
| 記事 | `src/lib/content/articles.ts`（本文）/ `minichecks.ts`（5問ミニチェック） | 「本当に必要？」5本 |
| ページ | `src/app/` | `/` `/check` `/check/result`（noindex・回答は URL のみ）`/need/*` `/guide/opening-order` 方針ページ `/api/decision` |

## コマンド

```bash
npm install
npm run dev              # 開発サーバー http://localhost:3000
npm run check            # typecheck + test + build（push 前に必須）
npm test                 # Vitest（受入基準 A01〜A24 に対応するテスト）
npm run build && npm start

# QA（サーバー起動中に実行。結果は docs/qa/ に出力）
npm run qa:seo           # title/description/canonical/JSON-LD/noindex/sitemap/robots
npm run qa:links         # 内部リンク切れ
npm run qa:screens       # 375/768/1440 のスクリーンショット + 横はみ出し検出
npm run qa:axe           # axe-core（serious/critical で失敗）
```

Playwright 管理のブラウザが無い環境では `PW_CHROMIUM=/path/to/chrome` を付けて `qa:screens` / `qa:axe` を実行してください。

## 公開前の Human-only Gate（10_BRAND_CLEARANCE_NOTE.md）

1. J-PlatPat で商標の文字・称呼・類似を確認
2. ドメインの実空き確認（`config/brand.json` の `site_url` は仮）
3. 主要 SNS handle 確認
4. ASP / Partner Program の申請と承認（`config/offers.json` の `smask_enrollment` / `affiliate_url`）
5. `config/features.json` の `public_release_enabled` と `config/brand.json` の `public_release` を true に
6. `/operator` の所在地・連絡先を記入

ブランド名は `config/brand.json` で一元管理しており、公開前に変更できます。
