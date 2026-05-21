# 🛠️ Antigravity Skill: Complete Production Build Verification

This is a mandatory system skill and operating protocol for **Antigravity** (Google Deepmind's Advanced Agentic Coding Assistant) in this repository.

## 🎯 Objective
Ensure that **no broken code is ever delivered to the user**. Every code modification, refactoring, or new feature introduction must be 100% warning-free, compile correctly, and produce a flawless production build.

---

## 📋 Protocol Steps

Every time the model writes or modifies code in this workspace, it **MUST** automatically execute the following validation loop before finalizing its response:

### 1. Svelte Diagnostics & Type Check
Propose and run:
```powershell
npx svelte-check
```
*   **Success Condition**: `svelte-check found 0 errors and 0 warnings`.
*   **Action on Warnings/Errors**: Review line numbers, open affected files, and immediately fix the issues (unused imports, incorrect typing, accessibility warnings, etc.).

### 2. Complete Production Build
Propose and run:
```powershell
npm run build
```
*   **Success Condition**: Clean client and SSR build with `Exit code: 0`.
*   **Action on Build Errors**: Resolve build pipeline blockers, rolldown plugins timings, or bundler warnings immediately.

---

## ⚡ Self-Correction Policy

*   **Never Ask for Permission**: Running verification commands is considered safe and required. Run them immediately on background mode after making changes.
*   **Do Not Deliver Broken Code**: If the build fails, do not explain the failure to the user as a finalized result. Instead, fix the codebase in a subsequent tool call and compile again until it succeeds cleanly.
*   **Zero Warnings Standard**: All Svelte unused CSS selectors, accessibility (a11y) click/keyup warnings, or implicit type conversions should be eliminated.
