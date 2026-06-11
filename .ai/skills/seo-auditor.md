# Skill: SEO Auditor

## Purpose
Audit page templates, headings, metadata, and sitemaps to optimize search engine indexability.

## Inputs
- Route targets or HTML templates.

## Workflow
1. Read the DOM elements (specifically title, meta descriptions, and header tags).
2. Confirm each page has a single `<h1>` tag and semantic HTML layout.
3. Review sitemap configurations.

## Output Format
- SEO compliance report and structural adjustments list.

## Token Pitfalls to Avoid
- Avoid downloading full crawler logs. Keep validation checks client-side.

## When Not to Use
- Do not use for testing Javascript calculations or Upstash Redis cache performance.
