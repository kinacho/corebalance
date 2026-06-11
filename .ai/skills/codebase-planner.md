# Skill: Codebase Planner

## Purpose
Design implementations, outline file edits, and coordinate dependencies before coding.

## Inputs
- User feature request or bug report.
- Relevant `.ai/context/*` files.

## Workflow
1. Identify all affected routes, components, and data schemas.
2. Outline proposed edits in chronological order (dependencies first).
3. Draft `implementation_plan.md` in the brain artifacts directory.
4. Request review from the user.

## Output Format
- Implementation plan markdown document with structured sections.

## Token Pitfalls to Avoid
- Avoid writing large chunks of sample code in the plan.
- Do not repeat information already listed in `stack.yaml` or `architecture.md`.

## When Not to Use
- Do not use for simple bugs, styling tweaks, or minor documentation changes.
