# Document Change Template

## Goal
Document architecture updates, database modifications, or api endpoints.

## Required Inputs
- Details of the changes made.

## Allowed Context Sources
- Git diff of the implementation.
- Relevant `.ai/context/` files.

## Steps
1. Gather the minimal facts about the changes (inputs, behavior, outputs).
2. Update the specific `.ai/context/` YAML/markdown file or `.ai/summaries/current-state.md`.
3. Keep additions short, operational, and machine-friendly.

## Deliverables
- Concise updates to `.ai/` directory.

## Stop Conditions
- Documentation aligns perfectly with new implementation without fluff.

## Token-Saving Notes
- Do not create new files for minor updates. Modify existing YAML configs instead.
