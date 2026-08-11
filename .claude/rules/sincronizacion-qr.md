---
paths:
  - "src/routes/sync/**"
  - "src/lib/sync-payload.ts"
  - "src/lib/components/SyncModal.svelte"
---

# Traspaso entre dispositivos por QR

<!-- Extraído de CLAUDE.md sin reescribir una palabra. El porqué del reparto, en la raíz. -->

### Device-to-device transfer by QR (`/sync`)

⚠️ **This feature shipped with its receiving half missing, and it was dead in four independent layers. Read this before touching either end.**

`SyncModal` generated a QR encoding `https://corebalance.app/sync#<payload>` and:

1. **`/sync` did not exist** — no route, no `rewrite` in `vercel.json`. Scanning the code landed on a 404 with the user's whole portfolio in the fragment. The modal also had a "scan from this device" button doing `window.location.href = '/sync'`, i.e. it threw you out of the app onto that same 404 — while promising a QR *reader* the app does not have (`qrcode` only generates). That button is gone: a button that cannot work is worse than no button.
2. **Nothing read the fragment.** Not one use of `location.hash` or `DecompressionStream` anywhere. Creating the route alone would have imported nothing.
3. **The payload was the whole backup, snapshot history included.** Measured with a realistic portfolio (9 assets, 25 transactions, 400 daily snapshots): **6.423 URL characters against the 2.000 limit the app itself declares** for a camera to read the code — the 400 snapshots are 42 of the 53 KB. So it could never have fitted for anyone who had used the app for a while. The transfer now carries the portfolio and its ledger and **not** the snapshot history, because the receiving device rebuilds that from prices and the ledger anyway (it is what `performanceSeries` does). Same portfolio: **1.173 characters**, fits with room.
4. ⚠️ **And the sender asked the *cloud* provider for the data.** `PUBLIC_USE_FIREBASE` is `true` in the shipped env, so `storageProvider` is `FirebaseStorage`, whose `getAllData()` starts with `if (!auth?.currentUser) throw`. Verified on screen: without signing in, the QR tab said **«Error: Debes iniciar sesión para exportar datos»** and drew nothing. The feature did not exist for the default user of an app whose whole argument is local-first — and the modal's own subtitle says *«tus datos viven en este navegador»* while the code asked the cloud for them.

What that last layer forces, and it is the design of the fix: the transfer goes through the **store** (`snapshotForTransfer()` / `applyTransfer()`), not the storage provider. It works with no session, works the same with and without Firebase, and there is **one** payload shape — whereas `getAllData()` returns a *different* shape per backend (`LocalDBStorage` gives a flat `transactions` array, `FirebaseStorage` wraps it as `[{userId, items}]`; that mismatch means a JSON backup taken on one build cannot be restored on the other, silently, and it is still open). Signed-in users lose nothing: the store pushes what was applied to the cloud on its own via `saveToStorage()` → `scheduleCloudSave()`.

- **The payload travels in the fragment (`#`), never in the query.** The fragment is not sent to the server, so the portfolio never reaches Vercel's logs. That is what forces `/sync` to be `ssr = false` — on the server that data does not exist — and `prerender = false` keeps it out of the sitemap. `hooks.server.ts` adds `X-Robots-Tag: noindex` for it (same reasoning as `/dashboard`: an `ssr = false` shell reads as a soft 404) and `isLocaleCookieRoute` includes it, because the shell's `%lang%` comes from the cookie.
- ⚠️ **`/sync` never imports on its own.** `applyTransfer()` **replaces** this device's portfolio, so the page shows what is coming (assets / transactions / adjustments) and asks. This repo already paid for a silent restore once — `importAllData({history: []})` emptying the portfolio with a reload 1,5 s later, so nobody could see it happen. Step 3 of the QR instructions now says it will ask.
- ⚠️ **`/sync` hands the dashboard the same one-shot `bypassLanding` ticket the landing uses.** The dashboard's gatekeeper bounces anyone with no session and no holdings, and it evaluates as soon as the store says it is initialised — which can be *before* storage has finished loading. Without the ticket, scanning the QR on a new phone lands you on the marketing page right after importing your portfolio, and it looks like nothing was imported.
- ⚠️ **The codec avoids `Blob`, and that is why it now has tests.** The old encoder did `new Blob([json]).stream()`, and jsdom's `Blob` has no `stream()` — which is precisely why the codec had never been tested and why nobody noticed there was no decoder. `ReadableStream` + `Response` behaves the same in the browser and can be unit-tested, which is what you need when two ends have to agree. Note the chunk type must be declared `BufferSource` (and `Uint8Array<ArrayBuffer>`), or `pipeThrough` does not typecheck — `npm run check` catches it.
- `decodeSyncPayload()` **throws** on anything that is not a transfer (bad base64, not deflate, wrong shape, wrong `v`). It has to: what arrives comes from a URL anyone can edit and what comes out gets written over the user's portfolio.
- `e2e/traspaso-por-qr.spec.ts` covers the whole path — fragment → summary → confirmation → dashboard with the assets in it — and builds its payload with **the app's own codec**, imported from `src/lib`, so the test fails if the two ends drift apart.
