# Fix Bug Template

## Goal
Resolve a functional discrepancy or error.

## Required Inputs
- Bug description or error trace.
- Reproducible steps or test case.

## Allowed Context Sources
- Code snippets around the crash/error line.
- Relevant unit tests.

## Steps
1. Write a failing test in Vitest reproducing the bug if possible.
2. Locate the root cause using targeted search (avoid reading unrelated files).
3. Apply the minimal fix to resolve the error.
4. Verify using Vitest or Playwright.

## Deliverables
- Bug resolution verified by passing tests.

## Stop Conditions
- Bug is fixed and no regression is introduced.

## Token-Saving Notes
- Do not inspect full files; target the specific error lines.
- Summarize fix behavior in 1-2 sentences.
