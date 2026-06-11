# Skill: Dependency Impact

## Purpose
Assess the consequence of adding, updating, or removing npm packages.

## Inputs
- Package name and version.

## Workflow
1. Check `package.json` for potential overlap with current libraries (e.g. adding a chart library when Chart.js exists).
2. Measure bundle impacts via process.env.ANALYZE if available.
3. Verify peer dependency warnings on Windows installation.

## Output Format
- Impact brief (Size, redundancy risk, security notes).

## Token Pitfalls to Avoid
- Do not list full dependency trees or package lock files.

## When Not to Use
- Do not use for standard logic edits or styling updates.
