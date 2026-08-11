---
paths:
  - "e2e/**"
  - "playwright.config.ts"
---

# Pruebas de extremo a extremo

<!-- Extraído de CLAUDE.md sin reescribir una palabra. El porqué del reparto, en la raíz. -->

### E2E (`e2e/`, `playwright.config.ts`)

Runs against `vite preview`, so **`npm run build` first**; the service worker, the precache and hashed chunks only exist in a build. It covers what unit tests structurally cannot: that the dashboard boots at all (it is `ssr = false`, so a hydration error yields a blank page with a green build), that the service worker registers and precaches ~145 entries, the deviation map in both states, the tax panel with a real plan in it, and `/dashboard` **with the network off**.

Three things learned writing it, all of which will bite again:
- ⚠️ **Fix the locale.** `hooks.server.ts` resolves language from `Accept-Language` when there is no cookie, so the dashboard renders in English or Spanish depending on the browser; specs that assert Spanish text failed as a timeout on an empty locator, which points at the assertion and not at the cause. `use.locale` + `Accept-Language` are pinned in the config, and the map panels are located by `.map-box:not(.is-lookthrough)` rather than by their title.
- ⚠️ **Intercept `/api/prices`.** Otherwise the store overwrites the seeded prices with whatever Yahoo says, fixture tickers resolve to 0, and the positions vanish from the map by the value filter.
- ⚠️ **A service worker never controls the navigation that installs it**, so the offline specs need a second visit before anything is cached. The first version failed with "the shell was not cached" and the defect was in my expectation, not in the code.

**The offline spec earned its keep on its first run**, one day after the service-worker fix was called done: it found that the cached shell alone is useless, because on hydration SvelteKit fetches `/dashboard/__data.json` and, with that request failing, the client router lands on its own "500 Ha ocurrido un error" page. Hence the second runtime route (`corebalance-dashboard-data`). No unit test can see this: it needs a real worker and a really dead network.
