# Implement Feature Template

## Goal
Implement a new product feature or functionality.

## Required Inputs
- Feature requirements/description.
- Existing affected UI views or stores.

## Allowed Context Sources
- `.ai/context/architecture.md`, `entities.yaml`, `stack.yaml`.
- Existing components in `src/lib/components/` or routes in `src/routes/`.

## Steps
1. Locate target Svelte components or server routes.
2. Draft implementation design; check impact on other files.
3. Edit Svelte components (using Svelte 5 Runes) and/or TypeScript files.
4. Run Svelte check and Vitest suite locally to prevent regressions.

## Deliverables
- Functional UI elements or routes.
- Updated unit or E2E tests if behavior changed.

## Stop Conditions
- Successful local build and passing test suite.

## Token-Saving Notes
- Never refactor unrelated files.
- Limit search scope using `rg` on exact identifiers.
