# Skill: Refactorer

## Purpose
Optimize or clean up code while preserving existing tests and functionalities.

## Inputs
- Targeted code files.
- Refactoring goals (e.g. migrate to runes, extract helper).

## Workflow
1. Run existing tests to verify functional baseline.
2. Edit target code using precise replacements.
3. Validate typescript compiler check (`npm run check`).
4. Re-run tests to confirm behavior parity.

## Output Format
- Git diff showing clean, organized edits.

## Token Pitfalls to Avoid
- Avoid changing exports or function signatures of public API boundaries.
- Do not refactor formatting across the whole project.

## When Not to Use
- Do not use when fixing a breaking production bug or adding new product capabilities.
