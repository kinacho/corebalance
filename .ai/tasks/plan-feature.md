# Plan Feature Template

## Goal
Design a feature before writing code, determining architecture impact and requirements.

## Required Inputs
- Feature requirements.
- CoreBalance context files (`.ai/context/*`).

## Allowed Context Sources
- `architecture.md`, `entities.yaml`, `stack.yaml`.

## Steps
1. Outline UI elements and reactive state needed (Svelte Runes).
2. Trace database schema changes (Dexie/IndexedDB) and Firebase syncing requirements.
3. Assess pricing API/Upstash Redis cache impact.
4. Draft the Implementation Plan in `implementation_plan.md`.

## Deliverables
- Approved implementation plan artifact.

## Stop Conditions
- User approves the plan.

## Token-Saving Notes
- Keep plans high-level, using structured schemas over prose.
