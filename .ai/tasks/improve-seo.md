# Improve SEO Template

## Goal
Improve metadata, search engine indexability, sitemap representation, and semantic structure.

## Required Inputs
- Target pages.

## Allowed Context Sources
- `src/routes/sitemap.xml`, `src/app.html`, `src/routes/+layout.svelte` and route-specific metadata.

## Steps
1. Inspect HTML head metadata, title tags, and meta descriptions.
2. Verify heading hierarchy (single `<h1>` per page, sequential headers).
3. Ensure PWA/manifest configurations do not conflict with indexability.
4. Update `sitemap.xml` route patterns if necessary.

## Deliverables
- Clean, SEO-compliant page templates.

## Stop Conditions
- Head validation passes, correct meta tags are present.

## Token-Saving Notes
- Keep SEO texts concise and to the point.
