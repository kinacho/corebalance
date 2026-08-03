# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

**CoreBalance** ([corebalance.app](https://corebalance.app)) — free, local-first portfolio rebalancing calculator for passive index investors (Spanish market focus, bilingual ES/EN). Svelte 5 (runes) + SvelteKit on Vercel. User data lives in the browser (IndexedDB via Dexie); cloud sync via Firebase is optional and only for logged-in users. Market prices come from a hybrid Yahoo Finance + Financial Times backend cached in Upstash Redis.

The repo is really two apps:

- **Prerendered marketing site** — landing, blog, comparativas, herramientas, autor — under `src/routes/(public)/[[lang=locale]]/`. Spanish at `/`, English at `/en/...`.
- **The calculator** at `/dashboard` — SPA-only (`ssr = false` in its `+layout.ts`), all data client-side. Dashboard code may touch `window`/`localStorage` freely, but nothing dashboard-related may be imported into a public route.

## Commands

| Command | Notes |
|---|---|
| `npm run dev` | Runs `vite dev` **and** the typesafe-i18n watcher in parallel. Editing `src/lib/i18n/es/index.ts` only regenerates types while this watcher runs. |
| `npm run build` | `prebuild` first regenerates icons, OG images and `llms*.txt` (`scripts/*.mjs`). |
| `npm run check` | `svelte-kit sync && svelte-check` (strict TS, `checkJs` too). |
| `npm test` | Vitest unit tests. |
| `npm test -- src/lib/rebalance.test.ts` | Run a single test file. |
| `npm run test:e2e` | ⚠️ Declared, but **no `playwright.config.ts` or spec files exist** — E2E is not actually set up. |
| `npm run backtest` | Regenerates `src/lib/data/backtest-8020.json` from real Yahoo data (citable dataset). |
| `npm run og` / `icons` / `llms` | Regenerate OG cards / icons / llms.txt manually. |
| `npm run indexnow` | Ping IndexNow with recently-modified sitemap URLs. Deliberately **not** hooked to the build. |
| `npm run measure:filters` | Measures what the mesh gradient, the `feTurbulence` overlay and the card `backdrop-filter`s actually cost, on throttled mobile (Playwright + CDP). Needs `npm run build` first. Prints its own noise floor — read that before believing any delta. Flags: `--runs <n>`, `--path <url>`. |
| `npm run seo:audit` | Audits the **built** HTML (`.svelte-kit/output`): duplicate/missing title-description-canonical, `hreflang` reciprocity, JSON-LD validity and required fields, OG images that 404, broken internal links, sitemap↔build consistency. Needs `npm run build` first. Exits non-zero on errors (warnings don't fail). Flags: `--verbose`, `--warnings`, `--dir <path>`. |

**Git policy**: never perform git operations without explicit user authorization. Commit style: Conventional Commits **in Spanish** (`feat(seo):`, `fix(i18n):`, `content(blog):`).

**Test files are versioned normally** — just `git add` them. The `.gitignore` used to exclude `*.test.ts`, `*.spec.ts`, `vitest.config.ts` and `setupTest.ts`, which left four suites (the CSV importers and the ledger's average-cost accounting) living only on the author's machine; that rule is gone and the suites are in git. Don't reintroduce it.

⚠️ **`/training/` is ignored wholesale** because it holds real broker exports with personal data (ISINs, balances, order numbers). It used to be a file-by-file list, and that gap let four real CSVs get committed. Suites that read those fixtures `skip` when the directory is absent, so a clean clone still passes.

## Architecture

### Rebalancing engine (the core math)

- `src/lib/rebalance.ts` — pure functions, no I/O: `calculatePortfolioState()` (per-position value/deviation/target, aggregates, sparkline) and `calculateRebalance()` (**cash-flow rebalancing**: buy-only, distributes a contribution pro-rata to each asset's deficit vs target; never sells, to avoid realizing capital gains). Supports `manualInterestRate` assets (cash/deposits with accrued interest).
- `src/lib/stores/portfolio.svelte.ts` — `PortfolioStore`, the app's brain (singleton `portfolio`). Holds holdings/transactions/prices/assets in `$state`, derives `ledgerHoldings` (weighted-average cost from the transaction ledger), calls `calculatePortfolioState` separately for the three buckets (`core` / `satellite` / `stocks`), handles price polling (30 s, exponential backoff, paused on hidden tab), auth, and cloud sync.
- **Non-obvious ledger accounting** (in `ledgerHoldings`): `dividend` transactions *reduce the cost basis* (they lower the average cost, they are not counted as profit); `sell` reduces total cost proportionally without changing the average cost; assets with `manualInterestRate` accrue interest per period between transactions (`rate/365 × days`). `effectiveHoldings` merges manual holdings with ledger-derived ones only for tickers with `useLedger: true`.
- Domain types in `src/lib/types.ts`; shared constants (localStorage keys, colors, tabs) in `src/lib/constants.ts`.

### Tax-aware rebalancing (Spanish IRPF) — the second engine

`calculateRebalance()` only buys. That is deliberate, but for the Spanish index investor it is *too* cautious in one very common case: **moving money between investment funds is not a taxable event** (art. 94 LIRPF, *traspaso* with tax deferral). Three pure modules cover that, all no-I/O and heavily tested:

- `src/lib/instrument-type.ts` — `resolveInstrumentType()` classifies an asset as `fund` / `etf` / `equity` / `cash` / `other`. **This is where everything else hangs from**: only `fund` can be transferred tax-free, and an ETF tracking the same index cannot. Signals in order of reliability: Yahoo's search `type` (`MUTUALFUND` is the clean one), a `0P…` ticker (how Yahoo identifies non-listed funds), the name, and lastly the ISIN — which only gives the country of issue and therefore **cannot** tell a fund from an ETF (IE00/LU covers both). Ambiguity returns `other`, and `other` is never touched by any plan. Read it through `instrumentTypeOf(asset)`, never `asset.instrumentType` directly.
- `src/lib/fiscal.ts` — FIFO over the ledger, savings-income brackets, and the wash-sale (*antiaplicación*) rule. **Deliberately diverges from `ledgerHoldings` in two ways, and both matter:** it uses FIFO (mandatory for homogeneous securities, art. 37.2) instead of weighted-average cost, and **dividends do not reduce the acquisition value here** even though they do in the ledger — fiscally a dividend is income of the year it is received. Applying the ledger's criterion would inflate the gain and the estimated tax. The wash-sale window is **2 months for listed securities and 12 months for fund units** (art. 33.5 f vs g; fund units are not admitted to trading). A blocked loss is **deferred, not forfeited** — it is still declared, it just does not offset gains this year, so it is excluded from the taxable base of the estimate.
- `src/lib/traspaso.ts` — `calculateTaxAwareRebalance()`. Pairs surplus with deficit **within each category** (targets only exist inside `core`/`satellite`/`stocks`; moving money across categories is a strategy change, not a rebalance), doing **all fund→fund pairs first** to maximise the tax-free amount. `fund → ETF` is a redemption, not a transfer: it is taxed even though the source is a fund. The savings-income scale is progressive and per-year, so tax is accumulated across the whole plan and each move pays what it adds to the scale. Also simulates how many months the contribution-only route would need, to give the user the real choice: fix it today vs fix it in N months.

Everything user-visible is labelled as an estimate, with the statutes cited in `traspaso.sources_body`. `SAVINGS_TAX_BRACKETS` / `SAVINGS_TAX_YEAR` live in **one dated constant** in `fiscal.ts` — those rates have changed three times in a decade.

### Look-through exposure and the maps

- `src/lib/lookthrough.ts` + `src/lib/data/indices.json` — what is actually inside the funds: regional and sector exposure, and overlap between positions ("your World and your S&P 500 point at the same companies"). Computed at **index level, never per holding**: real fund composition moves daily and needs a paid feed, while index weights move slowly and can be maintained by hand. Percentages are over **covered value**, not total portfolio, with `uncoveredValue` exposing what fell outside.
- **`indices.json` declares its own provenance.** Every index carries `regionsConfidence` and `sectorsConfidence`: `factsheet` (read off the official factsheet at `asOf`), `derived` (computed from other verified indices — the All-World is World + emerging), or `estimate` (order of magnitude, unverified). `calculateLookThrough()` returns `estimatedIndices` with only the unverified indices *that the user actually holds*, and the UI warns in orange. A test pins `msci-world` and `sp500` to `factsheet`. **When bumping `asOf`, re-check the factsheets and update the confidence flags** — the tests assert region and sector sums are 100 and that the World/US and S&P/tech weights match the published figures.
- `src/lib/treemap.ts` — squarified-ish treemap by binary splitting, ~30 lines, hand-rolled instead of pulling `chartjs-chart-treemap`: the maps are SVG, so they inherit `.privacy-blur` and the design tokens with no bridge, and it is deterministic and therefore testable (area conservation, no overlap, no infinite recursion on a dominant item).
- ⚠️ **The categorical palette in `constants.ts` is a validated artefact, not a taste choice.** `ASSET_COLORS` (six hues) and `CATEGORY_COLORS` (three) both pass all six checks of the `dataviz` skill's validator against the dark surface `#0d0d12`. The previous fifteen-hue palette **failed**: `#d946ef` and `#0ea5e9` sat next to each other and are indistinguishable under deuteranopia (ΔE 1.8), and eight of the fifteen were outside the lightness band. **If you touch either list, re-run the validator** (`node scripts/validate_palette.js "<hex,…>" --mode dark --surface "#0d0d12"` inside the skill). Non-obvious ordering constraints that fall out of it: green may not sit next to pink (ΔE 1.1 deutan) nor next to cyan (ΔE 11.8 even with normal vision), and blue may not sit next to violet (ΔE 0.4 deutan).
- **A seventh hue is never generated.** Past the six, charts fold the tail into an "Other" slice using `CHART_NEUTRAL`; `getNextColor()` reuses the least-used hue in fixed order. It used to fall back to `ASSET_COLORS[Math.floor(Math.random() * …)]`, which can hand out a colour already in the portfolio.
- **The deviation treemap is a diverging scale, and its midpoint is neutral grey on purpose.** A hue at a diverging midpoint is an anti-pattern — it competes with the poles and makes "on target" look as flagged as "drifted", when it is the opposite. It was green, which also collided with the categories donut sitting in the next carousel lane, where green meant a different thing.
- ⚠️ **SVG `<text>` neither wraps nor clips itself**, so a long label in a narrow cell paints straight over its neighbour. Two defences, and both are needed: `approximateTextWidth()` / `labelFits()` / `truncateToWidth()` decide *whether it is worth drawing* — with **per-character widths**, because a single average made all-caps tickers look 15% narrower than they render and `CASH-DEP` spilled out — and a `clipPath` per cell is the hard guarantee for when the estimate is wrong anyway. `DeviationTreemap.test.ts` asserts both invariants, on the desktop *and* the mobile geometry.
- ⚠️ **Never compose a sentence by injecting another sentence into a placeholder.** `treemap.tooltip` used to take a `{target}` slot filled with either a percentage or the phrase "sin objetivo", which rendered as "**objetivo sin objetivo**". One template per case (`tooltip` / `tooltip_no_target`) instead.
- **The maps size their type from the container's real width, not from a media query.** A `viewBox` and an SVG `font-size` are attributes, so CSS cannot adapt them; and the deciding number is the *container* width, not the viewport — in its carousel lane a map is ~340 px **on desktop too**, which is why type tied to `matchMedia` rendered 9 px labels on a large screen. Both maps take `contentWidth` from `MapFrame` via `bind:clientWidth` and convert a target pixel size into viewBox units. In the look-through map, narrow lanes show **only the percentage** and the names are read from the ranking below, because "Consumo discrecional" truncated to "Consu…" informs nobody.
- **`MapFrame.svelte` is the shared shell of both maps**: header, subtitle, its own controls slot and the expand button. **Expanding widens the panel in place — it is not a modal.** It was one at first, and it brought every modal problem for no gain: it locked page scroll via `body.modal-open`, the lock survived closing with Escape so the page stayed frozen, and on mobile the media query that hid the expand button hid its own close button too. Widening in place has none of those states. The grid owns the width (`deviationExpanded` / `lookThroughExpanded` in `+page.svelte` flip `.map-box.is-wide { grid-column: 1 / -1 }`), because a grid item cannot leave its own track. Nothing else has to change on expand: the maps derive type size and canvas ratio from `contentWidth`, so widening the track recomputes everything. Note jsdom then needs a `ResizeObserver` — there is a stub in `src/setupTest.ts` — and tests pick a geometry by stubbing `clientWidth`, not by faking `matchMedia`.
- **A map cell must never be nearly invisible.** Assets with no target weight were filled with white at 6 %, which over the dark surface is black: in any portfolio where only the core bucket has targets — the demo, and most real ones — six of nine cells vanished and the map looked broken. They now use `NO_TARGET_FILL` and are labelled "sin objetivo" instead of showing a fabricated deviation (`deviation` is `weight − 0`, i.e. the weight again). The diverging mix also starts at 60 % toward the pole, not 35 %, so a cell that has just left the band reads as coloured rather than grey. `DeviationTreemap.test.ts` asserts no fill is translucent or near-black.
- ⚠️ **Ordinary browser checks need one trick: `page.waitForURL` does not work for SvelteKit client-side navigation.** It waits for a `load` event that a client-side `goto` never fires, so it times out even though the URL changed. Poll `location.pathname` instead. Several hours were lost blaming the app for this.
- `DeviationTreemap.svelte` colours by **deviation from target, not daily change**. That is a product decision, not an oversight: daily colour teaches the user to check every day and react, which is the habit the app exists to prevent.

### Storage

`src/lib/db/index.ts` exports the `storageProvider` singleton (`LazyStorageProvider`) which picks its backend at first use from `PUBLIC_USE_FIREBASE === 'true'` (build-time env):

- `LocalDBStorage.ts` — Dexie DB `CoreBalanceDB` (tables `userData`, `history`, `transactions`; schema versions live here). **`localDB` is `null` during SSR — always guard.**
- `FirebaseStorage.ts` — Firestore `user_data/{uid}`, `user_history/{uid}`, `user_transactions/{uid}/items/*`. Sync is **last-write-wins** on `updatedAt` (and transaction conflicts are resolved by **item count** — whichever side has more wins — a fragile heuristic to keep in mind when touching sync), writes debounced 300 ms via `scheduleCloudSave()`. Firebase is code-split into its own chunk (`manualChunks` in `vite.config.ts`). Missing `VITE_FIREBASE_API_KEY` → sync silently disabled.
- `firestore.rules` (repo root) must be deployed manually; no Firebase CLI config in the repo.

### Price layer (server)

Endpoints in `src/routes/api/` — `prices`, `search`, `resolve` (ISIN→ticker), `support` (Resend email). All rate-limited via `src/lib/server/rateLimit.ts` (Redis INCR/EXPIRE, permissive in-memory fallback).

- `api/prices/priceHelpers.ts` — Yahoo bulk quotes, plus **Financial Times HTML scraping** for funds Yahoo prices badly (`RELIABLE_FT_MAPPINGS`) or lacks entirely (`src/lib/ft-assets.ts`, which documents the "how to add a fund" recipe). The FT scraper regexes HTML and silently falls back to Yahoo when FT changes markup. Subunit currencies (GBp etc.) are normalized by `correctSubunitCurrencies()`.
- Redis (`src/lib/server/redis.ts`, Upstash): only the **history/sparkline** is cached (`price_history:<ticker>`, TTL 4 h); live quotes always hit Yahoo. Without `KV_REST_API_URL/TOKEN` both cache and rate limiter degrade to per-process memory — effectively no caching/limiting on Vercel serverless.
- Currency pairs (`EURUSD=X`, …) are auto-appended to every price request; `CASH-*` tickers are synthetic (1.0 EUR).

### CSV broker importers

`src/lib/importers/` — `BrokerDetector` pattern: each broker exposes `{ detect(headers) → confidence, parse(rows) }`; order in `ALL_DETECTORS` matters (DEGIRO account-statement before DEGIRO transactions, generic last). Entry points `importFromCSV()` / `importWithMapping()`; import from the `$lib/importers` barrel. `csv-utils.ts` has the delimiter/header/ISIN heuristics and auto column-mapping. Real broker CSV fixtures live in `training/` (gitignored) and are exercised by `training_csv.test.ts`.

### i18n & routing (most convention-heavy area — read before touching)

- **typesafe-i18n**, base locale `es`. Hand-edit only `src/lib/i18n/es/index.ts` and `en/index.ts`; `i18n-types.ts`, `i18n-util*.ts`, `i18n-svelte.ts` are **generated**.
- ⚠️ **Only the base locale carries parameter type annotations.** `es` writes `{amount:string}` / `{months:number}`; `en` must write plain `{amount}` / `{months}`. Annotating the English file makes `npm run check` fail with one error per key (`Type '"…{shares:string}…"' is not assignable to type '`${string}{shares}${string}`'`). Adding keys outside `npm run dev` also means the watcher is not running, so regenerate by hand with `npx typesafe-i18n --no-watch`.
- **Single source of truth for bilingual routes:** `src/lib/i18n/bilingual-routes.js` (plain JS so `svelte.config.js` can import it). `BILINGUAL_ROUTES` feeds the prerender entries, the sitemap, hreflang alternates and the `$link()` store. `src/lib/i18n/routing.ts` is the typed wrapper (`alternates()`, `absoluteUrl`, `isLocaleCookieRoute`).
- **Blog posts are NOT bilingual routes.** Each post has its own translated slug at `/blog/<slug>` (no `/en/` prefix); the twin is resolved via frontmatter `slugs`. `src/lib/blog-locales.ts` maps slug→language with a deliberately **lazy** glob.
- **Locale resolution** (`src/hooks.server.ts`): URL prefix → post slug → `lang` cookie (only on `/dashboard` and `/api`) → `Accept-Language`. Language switching on public routes is a real `<a>` navigation with full document load — do not reintroduce store-based switching there. Two places call `setLocale`: the server hook, and the root `src/routes/+layout.ts` — which is a **universal** load, so it runs on the server too, not only in the browser.
- **`setLocale` writes a module-global store shared by every request in the process.** The hook therefore runs everything that renders components through a **single-lane queue** (`inRenderQueue`), so no other request can change the locale between `setLocale` and the response. Serializing is affordable only because that set is tiny: the 76 public pages are static files that never reach the hook, and `/dashboard` is `ssr = false`. `/api/*` is deliberately outside the queue **and never calls `setLocale`** — an endpoint that needs translations must use `i18nObject(locale)`, never the store, or it will clobber a page mid-render. `src/hooks.server.test.ts` guards this; the concurrency tests fail if the queue is removed.
- **Checklist for adding a bilingual page:** add to `BILINGUAL_ROUTES` → add `lastmod` entry to `STATIC_PAGES` in `src/routes/sitemap.xml/+server.ts` → add a `PAGES` entry in `scripts/generate-og.mjs` and `OgPageKey` in `src/lib/seo/og.ts` if it needs an OG card. A test in `src/lib/i18n/routing.test.ts` fails if `BILINGUAL_ROUTES` desyncs from the route tree.
- **In blog markdown, always write internal links with the canonical Spanish path** — the `remarkLocalizeLinks` plugin rewrites them per post language at build time.

### Content / blog

Markdown in `src/content/blog/{es,en}/*.md`, compiled by mdsvex. Three custom remark plugins defined inline in `svelte.config.js` inject `readingMinutes`, `faq` (h2/h3 ending in `?` → FAQPage JSON-LD) and localized links into frontmatter. SEO head for all public pages goes through `src/lib/components/seo/SeoHead.svelte`. `src/lib/blog.ts` uses an **eager** `import.meta.glob` — never import it from a universal load, only from server loads (see `related-reading.server.ts` for the pattern).

### State management

Runes mode is **forced** for all non-`node_modules` code (`compilerOptions.runes` in `svelte.config.js`) — no Svelte 4 stores in app code (the typesafe-i18n `LL`/`locale` readables are the exception). Pattern: classes with `$state`/`$derived` exported as module singletons (`portfolio`, `ui`).

### Styling & UI conventions

- `src/routes/layout.css` is the **only** CSS entry point (Tailwind v4 via `@import 'tailwindcss'`; there is no `tailwind.config.js`). Design tokens are CSS variables in `:root` (`--bg-primary`, `--bg-card`, `--text-primary`, `--text-muted`, `--accent-blue/green/orange`, …).
- Reuse the existing convention classes instead of reinventing them: `.privacy-mode`/`.privacy-blur` (blurs figures in privacy mode), `.shimmer` (skeletons), `.asset-card`, `.background-mesh`, `.noise-overlay` (uses the `#noiseFilter` SVG declared in `app.html`), `body.modal-open` (scroll lock).
- `font-variant-numeric: tabular-nums` is applied to a **closed list of classes** (`.metric-value`, `.summary-value`, `.asset-value`, `.total-value`, …) — a new class that displays figures must be added to that list or the digits jitter.
- Font: Plus Jakarta Sans, **self-hosted** in `static/fonts/` with woff2 400/700 preloads.
- **The heavy visual effects were measured and are not a performance problem — don't "optimize" them away.** `.background-mesh` (`filter: blur(80px)`, 40px on mobile, plus a 25 s infinite `transform` animation), the full-viewport `.noise-overlay` (`feTurbulence`) and the card `backdrop-filter: blur()` were all suspected of hurting LCP and INP. `npm run measure:filters` on throttled mobile says otherwise: LCP sits around 600–700 ms — roughly a third of the 2.5 s "good" threshold — and **every** difference between having the effects and removing them came out smaller than the run-to-run noise floor, sometimes with the wrong sign. The animation costs nothing sustained either: median frame 16.7 ms and **zero** frames over 32 ms in every variant, because a `transform` animation on a filtered layer is composited. These are lab numbers; the deciding data would be real Speed Insights field metrics, which need the Vercel account.
- Dashboard tabs (`src/routes/dashboard/+page.svelte`): all tabs render **always** and are hidden with `class:tab-hidden` — deliberately no `{#if}` per tab, so Chart.js canvases don't remount and lose state. Don't "optimize" this into conditionals. Same applies to the two maps, whose region/sector toggle would reset on every tab change.
- **`.charts-grid` is five lanes: three donuts and the two maps.** On mobile it is a scroll-snap carousel (`repeat(5, 100%)`), on desktop a fixed three-column grid where the look-through map spans two — fixed columns rather than `auto-fit` precisely so that span is predictable. The maps live here rather than in a section of their own because as full-width cards they took two screenfuls of mobile scrolling; as carousel lanes they are two more swipes. Two consequences to keep in mind when adding a lane: every lane needs `align-self: start`, or the tallest one (the look-through map) stretches the donuts into a huge empty box; and that same map's footnotes are inside a `<details>`, and its mobile canvas is deliberately *not* square, for the same reason.
- **The onboarding tour is two runs, not one** (`OnboardingTour.svelte`, driver.js). Which one fires is decided by `portfolio.hasAnyHoldings`: an **empty** portfolio gets three steps whose only job is getting data in (manage → import CSV), and a portfolio **with holdings or in demo mode** gets six, including the tax panel. It used to be a single eleven-step run, which meant the real first-time path — "Empezar gratis" on the landing sets `bypassLanding` and enters the dashboard *empty* — explained net worth over zeros and buried "import CSV" at step 11 of 11. Relaunching from the footer after adding assets therefore upgrades you to the full run, which is the behaviour you want. `corebalance_tour_seen` is written in `onDestroyed`, **not** when the tour starts, so a reload mid-run does not burn it.
- ⚠️ **Do not add tour steps for every new feature.** The step budget is the point: a step earns its place only if the feature is something the user would not otherwise discover *exists* (that is why the tax panel has one and the maps share a single step — a map explains itself once seen). Steps without an `element` render as a centred modal, which is how the welcome step is done deliberately; the old code pointed it at `#tour-welcome`, an id that exists nowhere, and got the same result by accident.
- ⚠️ **`.tab-hidden` flips to `display: block !important` above 1024px** (there are no tabs on desktop). Any container that needs another display mode must re-assert it inside that media query — see `.sidebar-item.tab-hidden { display: flex }`. Forget it and the layout silently collapses to a single column on desktop only.

### hooks.server.ts

Does four things: locale resolution, `lang` cookie policy (`Vary: Cookie` only on `/dashboard`/`/api` so public pages stay CDN-cacheable), security headers, and a hand-built CSP. **Any new third-party script/domain must be added to `cspDirectives` there.**

## Testing

Vitest + jsdom, `*.test.ts` **colocated next to the source file**. Setup in `src/setupTest.ts` (jest-dom, `matchMedia`/`scrollTo` polyfills). The SvelteKit plugin is loaded, so `$lib`/`$app` aliases work in tests. Component tests use `@testing-library/svelte`. Key suites: `rebalance.test.ts` (core math), `fiscal.test.ts` + `traspaso.test.ts` + `instrument-type.test.ts` (the tax engine — where being wrong costs the user money, so FIFO, the progressive scale, the wash-sale windows and "a fund→ETF move is not a transfer" all have their own cases), `lookthrough.test.ts` (also the integrity of `indices.json`: sums, confidence flags, no undeclared region/sector keys), `treemap.test.ts` (area conservation and no overlap), `importers/parsers.test.ts` (all broker detectors), `importers/training_csv.test.ts` (real CSVs from `training/`, skipped when that directory is absent), `i18n/routing.test.ts`, `i18n/version.test.ts` (guards the four copies of the version number), and `scripts/seo-audit.test.ts` (runs the SEO linter against a deliberately broken mini-build in `scripts/__fixtures__/seo-audit/` — a linter that stops detecting looks exactly like a clean site, so it needs its own fixture). `vitest.config.ts` therefore includes both `src/**` and `scripts/**`.

Tests must use **fixed dates**, never `Date.now()` — the fiscal windows are date arithmetic and a suite that passes today would fail in three months. `calculateTaxAwareRebalance()` takes `now` in its options for exactly that reason.

`TaxAwareRebalance.test.ts` renders the component with a mocked store, and it exists for a specific reason: **the demo portfolio is exactly on target**, so in a browser that panel always says "nothing to move" and the populated path was never exercised anywhere.

## Gotchas

- ⚠️ **Never rewrite a source file with PowerShell `Set-Content`.** It defaults to the system ANSI codepage, so every accented character in the file comes back mangled (`→` became `â†’` in `i18n/en/index.ts`). Half this repo is Spanish prose. Use the editing tools, or `Out-File -Encoding utf8` if there is no alternative. A `git diff --stat` that shows modified lines you did not touch is the tell.
- **`Asset.instrumentType` and `Asset.indexKey` are optional for back-compat** and filled in by `normalizeAssets()` in the store. That helper runs on **both** load paths — `loadFromStorage()` *and* the Firestore branch — because a portfolio arriving from the cloud never passes through the local one, and skipping it would leave the tax panel silent precisely for logged-in users. It only writes where there is a gap, so a manual correction from Manage Assets always wins.
- `static/sw.js` is a **self-unregistering stub** to kill stale dev service workers; the real production SW is generated by vite-pwa. The SW is active in `vite dev` (`devOptions.enabled: true`) — hard-reload/unregister when dev looks stale.
- Workbox deliberately does **not** precache prerendered HTML (the CDN serves it), so offline navigation needs an explicit fallback. `navigateFallback` is **`null` on purpose**: it registers a `NavigationRoute` that would serve *every* navigation from the precache, including online ones. The fallback is instead a `NetworkOnly` route with `PrecacheFallbackPlugin` pointing at `/offline` — no extension, because @vite-pwa/sveltekit rewrites `.html` manifest entries to clean URLs, which is why the old `createHandlerBoundToURL('/offline.html')` never resolved. All of it is commented in `vite.config.ts`.
- `STATIC_PAGES` in the sitemap has hand-maintained `lastmod` dates — bump the date when a page's *visible content* changes (deliberately not `new Date()`).
- `vercel.json` only sets headers for `/.well-known/assetlinks.json` (Android TWA link verification, left over from a Play Store deploy that is parked) and the web manifest.
- Env vars: `PUBLIC_USE_FIREBASE` (build-time, selects storage backend), `VITE_FIREBASE_*`, `KV_REST_API_URL/TOKEN` (Upstash), `RESEND_API_KEY`. See `.env.example`.
- `src/app.html` contains an inline splash/gatekeeper script that **hardcodes the localStorage key `corebalance_holdings_v2`**, duplicating `STORAGE_KEY_HOLDINGS` from `src/lib/constants.ts` — renaming the key requires touching both places. It also captures `window.__deferredPrompt` (PWA install) and substitutes `%lang%` via the server hook.
- **This file is the only prose source of truth about the repo.** There used to be a parallel `.ai/` tree (61 files of rules, context and summaries) plus four root planning documents; every one of them had drifted from the code — wrong fonts, a claim that E2E tests existed, a claim that the app was "100% dynamic SSR" when it is the inverse. They were deleted rather than fixed. If you find a claim about this project in a file other than `CLAUDE.md`, `README.md` or `SECURITY.md`, distrust it and check the code.
- **The version number lives in five places at once** — `package.json`, `changelog_trigger` in both i18n files, the `changelog_modal.releases` keys in both i18n files, and **two** separate lists in `ChangelogModal.svelte`: `releaseVersions` *and* `badgeColors`. They desynced once (footer stuck at v1.9.0 with the app on 1.10.0). `src/lib/i18n/version.test.ts` fails when they drift — and `badgeColors` is the one that gets forgotten, because everything renders fine without it (the badge just loses its colour), so only the test catches it. Bump all five together.

---

<!-- rtk-instructions v2 -->
# RTK (Rust Token Killer) - Token-Optimized Commands

## Golden Rule

**Always prefix commands with `rtk`**. If RTK has a dedicated filter, it uses it. If not, it passes through unchanged. This means RTK is always safe to use.

**Important**: Even in command chains with `&&`, use `rtk`:
```bash
# ❌ Wrong
git add . && git commit -m "msg" && git push

# ✅ Correct
rtk git add . && rtk git commit -m "msg" && rtk git push
```

## RTK Commands by Workflow

### Build & Compile (80-90% savings)
```bash
rtk cargo build         # Cargo build output
rtk cargo check         # Cargo check output
rtk cargo clippy        # Clippy warnings grouped by file (80%)
rtk tsc                 # TypeScript errors grouped by file/code (83%)
rtk lint                # ESLint/Biome violations grouped (84%)
rtk prettier --check    # Files needing format only (70%)
rtk next build          # Next.js build with route metrics (87%)
```

### Test (60-99% savings)
```bash
rtk cargo test          # Cargo test failures only (90%)
rtk go test             # Go test failures only (90%)
rtk jest                # Jest failures only (99.5%)
rtk vitest              # Vitest failures only (99.5%)
rtk playwright test     # Playwright failures only (94%)
rtk pytest              # Python test failures only (90%)
rtk rake test           # Ruby test failures only (90%)
rtk rspec               # RSpec test failures only (60%)
rtk test <cmd>          # Generic test wrapper - failures only
```

### Git (59-80% savings)
```bash
rtk git status          # Compact status
rtk git log             # Compact log (works with all git flags)
rtk git diff            # Compact diff (80%)
rtk git show            # Compact show (80%)
rtk git add             # Ultra-compact confirmations (59%)
rtk git commit          # Ultra-compact confirmations (59%)
rtk git push            # Ultra-compact confirmations
rtk git pull            # Ultra-compact confirmations
rtk git branch          # Compact branch list
rtk git fetch           # Compact fetch
rtk git stash           # Compact stash
rtk git worktree        # Compact worktree
```

Note: Git passthrough works for ALL subcommands, even those not explicitly listed.

### GitHub (26-87% savings)
```bash
rtk gh pr view <num>    # Compact PR view (87%)
rtk gh pr checks        # Compact PR checks (79%)
rtk gh run list         # Compact workflow runs (82%)
rtk gh issue list       # Compact issue list (80%)
rtk gh api              # Compact API responses (26%)
```

### JavaScript/TypeScript Tooling (70-90% savings)
```bash
rtk pnpm list           # Compact dependency tree (70%)
rtk pnpm outdated       # Compact outdated packages (80%)
rtk pnpm install        # Compact install output (90%)
rtk npm run <script>    # Compact npm script output
rtk npx <cmd>           # Compact npx command output
rtk prisma              # Prisma without ASCII art (88%)
```

### Files & Search (60-75% savings)
```bash
rtk ls <path>           # Tree format, compact (65%)
rtk read <file>         # Code reading with filtering (60%)
rtk grep <pattern>      # Search grouped by file (75%). Format flags (-c, -l, -L, -o, -Z) run raw.
rtk find <pattern>      # Find grouped by directory (70%)
```

### Analysis & Debug (70-90% savings)
```bash
rtk err <cmd>           # Filter errors only from any command
rtk log <file>          # Deduplicated logs with counts
rtk json <file>         # JSON structure without values
rtk deps                # Dependency overview
rtk env                 # Environment variables compact
rtk summary <cmd>       # Smart summary of command output
rtk diff                # Ultra-compact diffs
```

### Infrastructure (85% savings)
```bash
rtk docker ps           # Compact container list
rtk docker images       # Compact image list
rtk docker logs <c>     # Deduplicated logs
rtk kubectl get         # Compact resource list
rtk kubectl logs        # Deduplicated pod logs
```

### Network (65-70% savings)
```bash
rtk curl <url>          # Compact HTTP responses (70%)
rtk wget <url>          # Compact download output (65%)
```

### Meta Commands
```bash
rtk gain                # View token savings statistics
rtk gain --history      # View command history with savings
rtk discover            # Analyze Claude Code sessions for missed RTK usage
rtk proxy <cmd>         # Run command without filtering (for debugging)
rtk init                # Add RTK instructions to CLAUDE.md
rtk init --global       # Add RTK to ~/.claude/CLAUDE.md
```

## Token Savings Overview

| Category | Commands | Typical Savings |
|----------|----------|-----------------|
| Tests | vitest, playwright, cargo test | 90-99% |
| Build | next, tsc, lint, prettier | 70-87% |
| Git | status, log, diff, add, commit | 59-80% |
| GitHub | gh pr, gh run, gh issue | 26-87% |
| Package Managers | pnpm, npm, npx | 70-90% |
| Files | ls, read, grep, find | 60-75% |
| Infrastructure | docker, kubectl | 85% |
| Network | curl, wget | 65-70% |

Overall average: **60-90% token reduction** on common development operations.
<!-- /rtk-instructions -->
