# Skill: Performance Auditor

## Purpose
Audit script load speed, bundle sizing, caching behaviors, and db transactions.

## Inputs
- Webpack/Vite build logs, speed measurements, or bundle breakdown.

## Workflow
1. Check bundle size metrics using visualizer if process.env.ANALYZE is set.
2. Review Dexie DB transaction execution plans to prevent thread blocking.
3. Validate Upstash cache headers and hit rates.

## Output Format
- Performance status overview and optimization recommendations.

## Token Pitfalls to Avoid
- Do not print full trace files or compilation reports.

## When Not to Use
- Do not use for testing visual layouts or spelling/localization files.
