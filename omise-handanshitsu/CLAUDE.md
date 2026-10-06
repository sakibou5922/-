# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

「お店の判断室」— a Japanese decision-guide site for small shops (should I adopt a reservation system / POS / cashless / LINE / listing platform, and in what order?). State: **PREVIEW CANDIDATE**. Public release, affiliate programs, domain and trademark are all *not* executed; every feature flag in `config/features.json` is `false` and must stay so until the human gate in `docs/spec/10_BRAND_CLEARANCE_NOTE.md` passes.

The product/engineering spec lives in `docs/spec/` (13 numbered Markdown files + `content_drafts/` + the original `config/`). When behavior is in doubt, the spec wins; `docs/spec/09_ACCEPTANCE.md` (A01–A25) is the definition of done and the tests mirror it.

## Commands

```bash
npm install
npm run dev            # next dev on :3000
npm run typecheck      # tsc --noEmit
npm test               # vitest run (tests/**/*.test.ts)
npx vitest run tests/engine.test.ts            # one file
npx vitest run -t "A04"                        # tests whose name matches
npm run build && npm start                     # production build + server
npm run check          # typecheck + test + build (what must pass before pushing)
```

QA scripts need a running server (`BASE_URL` defaults to `http://localhost:3000`) and write reports to `docs/qa/`:

```bash
npm run qa:seo       # title/description/canonical/JSON-LD/noindex/sitemap/robots
npm run qa:links     # internal link crawl (add --external to HEAD external links)
PW_CHROMIUM=/opt/pw-browsers/chromium npm run qa:screens   # 375/768/1440 shots + horizontal-overflow check
PW_CHROMIUM=/opt/pw-browsers/chromium npm run qa:axe       # axe-core, fails on serious/critical
```

`PW_CHROMIUM` is only needed where the Playwright-managed browser version is missing (e.g. this cloud container); omit it locally.

Stack rules (from the owner's development policy): TypeScript + Next.js App Router, **plain CSS only** (`src/app/globals.css`; do not add Tailwind or CSS-in-JS), no paid APIs, no new third-party accounts, no external analytics SDK.

## Architecture

Three strictly separated layers, all driven by JSON in `config/` (the single data layer the spec demands):

1. **Decision engine** — `src/lib/decision/engine.ts`, pure and deterministic. `parse.ts` validates/normalizes the 8 + 3 conditional answers (conditional answers are dropped when their condition is false, required when true; it is the only engine module shipped to the client). `decide()` walks `config/decision.rules.json`: `areas` (order + which "existing service" maps to each area), `scores`/`thresholds` per scored area, `hard_rules.not_priority_when` (answer conditions → NOT_PRIORITY), `hard_rules.caps` (max status, optionally `unless` an answer matches or only `when_existing` a service), then caps NOW to `max_now` and NEXT to `max_next` by score (overflow is demoted with a reason and `demoted_from`). Only GOOGLE_FOUNDATION (always free) and INTEGRATION (hidden unless ≥3 existing services + manual duplication) are special-cased in code. Existing services always become `REVIEW_EXISTING`, never a recommendation. Scores never leave this module: results carry only Japanese reason strings built in `labels.ts`. The engine must never import flags or offers (test A02 asserts this).
2. **Offer layer** — `src/lib/offers.ts` + `config/offers.json`. `selectOffers(area, status, {now, flags?, offers?})` returns cards only when `isNeedConfirmed(status)` (NOW / NEXT / FREE_FOUNDATION), in fixed `display_order` (never by payout). `isListed()` hides EXPIRED and shows UNVERIFIED/PAUSED programs only as official cards when `official_fallback` is true. A link is `sponsored` (rel=sponsored, PR label) only when flag ON **and** `status: ACTIVE` **and** `smask_enrollment: APPROVED` **and** `affiliate_url` set **and** the offer is fresh **and** no registry source is stale (site-wide block); anything less falls back to `official_url` (fail closed). Official competitors (Airレジ, Airペイ…) are always listed alongside.
3. **Evidence / freshness** — `src/lib/evidence.ts` + `config/evidence.registry.json` + `config/freshness.json`. Every brand-named numeric claim (articles' `costFacts`, offer `fee_summary`) references source ids; `isFresh`/`checkSource(id, now)` apply 30/90/90-day windows and stale facts are replaced by the `fallback` text (`<Fact>` component) or nulled on offer cards.

Flow through the app: article (`/need/[slug]`, prose in `src/lib/content/articles.ts`, the 5-question mini checks in `minichecks.ts`) → client `MiniCheck` resolves one of the article's states and writes a prefill to `sessionStorage` via `src/lib/prefill.ts` (consumed on read) → `/check?from=<area>` `CheckWizard` skips prefilled questions, then navigates to `/check/result?st=…` where **the answers live in the URL** (`src/lib/decision/encode.ts`: `resultHref`, `checkHref`) — nothing is persisted server-side, so the same URL always gives the same result. `/api/decision` (POST) is the formal endpoint over the same `decide()`.

Site-wide switches are in `src/lib/site.ts`: `FLAGS` (config + `FLAG_<NAME>=true` env override), `isPublicRelease()` (drives the preview banner, `robots` meta and `robots.txt` deny-all), `BRAND` (brand name is config-only so it can be renamed before launch), `PUBLIC_ROUTES` / `NOINDEX_PREFIXES` (`config/routes.json`). `src/lib/seo.ts` holds the pure sitemap/robots/JSON-LD builders; `app/sitemap.ts` and `app/robots.ts` only call them. `absoluteUrl("/")` has no trailing slash so canonical and sitemap agree.

## Conventions that are easy to get wrong

- Article pages use ISR (`revalidate = 3600`) so freshness is re-evaluated; the result page and the API are `force-dynamic`. Pass `now` explicitly into `selectOffers`/`Fact` from the page rather than reading the clock inside the libs (tests inject dates).
- Offer cards must render **below** decision cards and only after need confirmation (`MiniCheck` renders `OfferSection` itself when the state's `need === "CONFIRMED"`; the result page renders them after all groups). Never show offers during the wizard.
- Status is identified by label/badge text, never by color alone; the status palette lives in `globals.css` (`.status--*`, `.decision--*`, `.tier--*`). Contrast was validated at ≥4.5:1 — re-run `qa:axe` after changing tokens.
- Analytics is `src/lib/analytics.ts` → `window.dataLayer` push only; event names are the fixed union from `docs/spec/07_SEO_ANALYTICS.md`. Never send answers or PII.
- Adding an article: append to `ARTICLES` (5 mini-check questions, states must match `decisionRows`, every brand-numeric `costFact` needs `sources` + `fallback`), add the route to `config/routes.json`; `tests/content.test.ts` brute-forces every mini-check combination and checks these invariants.
- `vitest.config.mts` must keep the `.mts` extension (package.json is CommonJS).
