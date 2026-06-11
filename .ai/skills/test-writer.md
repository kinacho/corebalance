# Skill: Test Writer

## Purpose
Write tests using Vitest (unit/integration) or Playwright (E2E).

## Inputs
- Function, store, component, or endpoint to test.

## Workflow
1. Inspect surrounding tests for layout conventions (e.g. `src/lib/rebalance.test.ts`).
2. Draft mock values and assertions.
3. Write test code, avoiding global scope pollution.
4. Execute test using Vitest target: `npx vitest run <path_to_test>`.

## Output Format
- TypeScript test file with clear describe/test blocks.

## Token Pitfalls to Avoid
- Do not run the full Vitest suite recursively if you only edited one test.
- Keep test data fixtures short.

## When Not to Use
- Do not use for documenting code or editing layouts.
