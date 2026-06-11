# Skill: Firebase Auditor

## Purpose
Audit firebase configuration, authentication triggers, and synchronizer boundaries.

## Inputs
- `firestore.rules` and `src/lib/firebase.ts`.

## Workflow
1. Check for hardcoded credentials or API keys.
2. Review Firestore read/write restrictions (authenticated user scope).
3. Validate connection persistence logic.

## Output Format
- Security status checklist and configuration audit.

## Token Pitfalls to Avoid
- Do not download database snapshot contents.
- Keep validation focused on rules and sync boundaries.

## When Not to Use
- Do not use for general frontend styling or local IndexedDB changes.
