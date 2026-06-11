# Write Tests Template

## Goal
Add unit, integration, or E2E tests for new or existing features.

## Required Inputs
- Target files/modules to test.
- Test framework parameters (Vitest/Playwright).

## Allowed Context Sources
- Existing tests (e.g., `src/lib/rebalance.test.ts` or `src/lib/stores/ledgerHoldings.test.ts`).
- Public API of target module.

## Steps
1. Review existing test conventions and mock patterns in the repo.
2. Create/modify the `.test.ts` or `.spec.ts` file.
3. Run tests using `npm run test` or `npx playwright test`.
4. Check edge cases (empty states, negative amounts, invalid tickers).

## Deliverables
- Executable tests that run on Windows shell without issues.

## Stop Conditions
- All new and old tests pass.

## Token-Saving Notes
- Use exact targets (e.g., `npm run test -- <filename>`) instead of running the whole suite when testing.
