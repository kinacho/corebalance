# Current State

- **App Name**: CoreBalance (Rebalanceador-90-5-5)
- **Version**: 1.8.0 (from package.json)
- **Stack**: Svelte 5 (Runes), Tailwind CSS v4, Dexie.js (IndexedDB), Upstash Redis, Firebase v12 (Auth/Sync).
- **Test Status**: Unit test coverage in `src/lib/rebalance.test.ts` and `src/lib/stores/ledgerHoldings.test.ts`. E2E tests configured via Playwright.
- **Active Code Base**:
  - `src/lib/rebalance.ts`: Core rebalancing logic.
  - `src/lib/firebase.ts`: Optional sync gateway.
  - `src/routes/dashboard/+page.svelte`: Main dashboard view.
  - `src/lib/i18n/`: Localization structure (typesafe-i18n, Spanish base).
