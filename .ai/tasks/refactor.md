# Refactor Template

## Goal
Improve code structure, maintainability, or readability without changing external behavior.

## Required Inputs
- Target files/modules to refactor.
- Rationale for refactoring.

## Allowed Context Sources
- Direct files targeted for refactoring.
- Associated unit tests to ensure behavior parity.

## Steps
1. Review target code and write/check tests covering existing behavior.
2. Refactor logic incrementally (using Svelte 5 Runes if in UI).
3. Run test suite frequently after each incremental change.
4. Ensure no new dependencies are introduced unless requested.

## Deliverables
- Cleaner, modularized code.
- Fully green test suite with identical coverage.

## Stop Conditions
- Refactoring completed, code builds, and all tests pass.

## Token-Saving Notes
- Keep diffs localized; avoid changing exports or API surfaces of the refactored module.
