# Svelte Rules

- **Svelte 5 Runes**: Use `$state`, `$derived`, and `$effect` for reactivity. Avoid old Svelte 4 store structures unless interacting with legacy stores.
- **Routing**: SvelteKit routes use `+page.svelte`, `+layout.svelte`, `+page.ts` and `+layout.ts` folder-based layouts.
- **Tailwind integration**: Apply styling using Tailwind classes directly in tags. Do not use ad-hoc inline styling attributes unless dynamic.
- **State Hydration**: Be mindful of SSR/CSR hydration mismatches. Use browser-checks (`import { browser } from '$app/environment'`) when accessing client-only APIs (like localStorage or Dexie DB).
