# Improve Performance Template

## Goal
Optimize page loads, asset size, local-first DB querying, or rendering speed.

## Required Inputs
- Performance report or problem area (e.g. slow chart render, large chunk size).

## Allowed Context Sources
- `vite.config.ts`, `src/lib/db/`, and affected views.

## Steps
1. Measure rendering/load behavior (check console speed indicators).
2. Check for unnecessary Svelte 5 reactive triggers or double $effects.
3. Optimize queries or bundle chunks (e.g. manual rollup splitting).
4. Run Svelte compilation checks and measure bundle visualizer if process.env.ANALYZE is set.

## Deliverables
- Quantifiable speedups or bundle size reduction.

## Stop Conditions
- Target performance/bundle metric met without breaking functionality.

## Token-Saving Notes
- Do not add packages. Optimize using native Svelte or JS tools.
