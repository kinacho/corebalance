# Self-Review Template

## Goal
Verify code quality, correctness, performance, and token optimization before finalizing a task.

## Required Inputs
- Git diff of the changes.

## Allowed Context Sources
- `.ai/rules/global-rules.md`, `coding-rules.md`.

## Steps
1. Generate git diff (compacted output).
2. Check for unused variables, leftover console logs, or debug comments.
3. Verify styling follows Tailwind v4 and Svelte 5 Rune structures.
4. Confirm no regression exists by executing lint and tests.

## Deliverables
- Verified diff free of noise, formatting errors, or broken tests.

## Stop Conditions
- Code is clean, builds successfully, and adheres to rules.

## Token-Saving Notes
- Do not read full files again. Check the diff directly.
