# Testing Rules

- **Vitest**: Run unit tests using `npm run test` or targeting a file: `npx vitest run src/lib/rebalance.test.ts`.
- **Mocking**: Mock external requests (like Yahoo Finance fetch calls) in tests to guarantee offline test runs.
- **Coverage**: Ensure critical rebalancing and calculations logic is covered by unit tests.
- **Playwright**: E2E tests are used to check user interface flows. Run E2E tests locally before pushing logic changes.
- **Regression Protection**: Do not break existing tests; modify tests only if requirements have changed.
