---
paths:
  - "src/lib/db/**"
  - "src/lib/firebase.ts"
  - "firestore.rules"
---

# Almacenamiento local y sincronización con la nube

<!-- Extraído de CLAUDE.md sin reescribir una palabra. El porqué del reparto, en la raíz. -->

### Storage

`src/lib/db/index.ts` exports the `storageProvider` singleton (`LazyStorageProvider`) which picks its backend at first use from `PUBLIC_USE_FIREBASE === 'true'` (build-time env):

- `LocalDBStorage.ts` — Dexie DB `CoreBalanceDB` (tables `userData`, `history`, `transactions`; schema versions live here). **`localDB` is `null` during SSR — always guard.**
- ⚠️ **`importAllData({ history: [] })` used to wipe all four tables and restore nothing** — restoring a backup turned into deleting the portfolio, and `SyncModal` reloads the page 1,5 s later, so the user never got to see it happen. The guard only tested `!data`. It is **not** enough that the caller validates: `validateImportData()` deliberately accepts `{ history: [] }` (pinned as correct in `utils.test.ts`), so the check has to live where the damage is done. Emptying is not a use case of that function — `deleteAccount()` is. Fixed 10-ago-2026 with `LocalDBStorage.test.ts`.
- ⚠️ **The three-layer merge in `saveUserData` (`defaults → existing → data`) is the contract of that class, not tidiness.** The store autosaves **partially**, so with `...data` before `...existing` every save would revert the fields it does not mention — contribution back to 0, holdings back to `{}` — with no error anywhere. The merge is **shallow** on purpose: `holdings` arrives whole on every save.
- **Its suite needs `fake-indexeddb`** (devDependency, zero transitive deps) because jsdom has no IndexedDB, plus `vi.mock('$app/environment', () => ({ browser: true }))` — without that, `localDB` is `null` and there is no storage to test. What the suite pins is what *decides* something: the merge order, that the `load*` methods return `[]`/`null` rather than `undefined` (the store calls `.length` on them, and the dashboard is `ssr = false`, so a `TypeError` there is a blank page), per-user isolation, and the two destructive operations. The one-line Dexie wrappers are not tested one by one — that would be testing Dexie. Note `db/index.test.ts` does **not** cover any of this: it `vi.doMock`s the module, so it tests the backend selector, not the storage.
- `FirebaseStorage.ts` — Firestore `user_data/{uid}`, `user_history/{uid}`, `user_transactions/{uid}/items/*` and `user_holding_edits/{uid}`. Sync is **last-write-wins** on `updatedAt` (and transaction conflicts are resolved by **item count** — whichever side has more wins — a fragile heuristic to keep in mind when touching sync), writes debounced 300 ms via `scheduleCloudSave()`. Firebase is code-split into its own chunk (`manualChunks` in `vite.config.ts`). Missing `VITE_FIREBASE_API_KEY` → sync silently disabled.
- `firestore.rules` (repo root) must be deployed manually; no Firebase CLI config in the repo.
