# 🚀 Antigravity Skill: Automatic Version Bumping & Changelog Updates

This is a mandatory system skill and operating protocol for **Antigravity** (Google Deepmind's Advanced Agentic Coding Assistant) in this repository when preparing releases or merging features to the `main` branch.

## 🎯 Objective
Automate version control, synchronize Svelte and package configurations, and compile beautiful, up-to-date user-facing release notes without manual intervention.

---

## 📋 Protocol Steps

Whenever a feature branch is ready to be merged, or when requested to prepare a release, Antigravity **MUST** execute these sequential steps:

### 1. Collect Feature Branch Changes
*   Analyze the Git commit history of the current branch compared to `main`.
*   Formulate a clean, bulleted list in Spanish of the changes, prefixed with appropriate emojis:
    *   🧠 for major engine/algorithm updates.
    *   🔒 for security/safety/locking additions.
    *   ♻️ for refactorings and cleaning.
    *   💾 for storage or offline features.
    *   🕶️ or 🎨 for design, CSS, and styling changes.
    *   🐛 or ⚙️ for bug fixes and configurations.

### 2. Determine Next Semantic Version
*   Assess whether the changes are:
    *   **Patch** (small fixes, minor updates): Increment Z (`v1.2.0` -> `v1.2.1`).
    *   **Minor** (new tools, major features): Increment Y (`v1.2.0` -> `v1.3.0`).
    *   **Major** (structural overhauls): Increment X (`v1.2.0` -> `v2.0.0`).

### 3. Synchronize Codebase Configurations
Automatically apply changes across the three core files:

#### A. `package.json`
Update the root `"version"` property to match the new version string (e.g. `"1.3.0"`).

#### B. `src/lib/components/ChangelogModal.svelte`
Insert a new release object at the very top of the `releases` array:
```typescript
{
	version: 'vX.Y.Z',
	date: '[Current Date in Spanish]',
	badge: '[Badge Title, e.g. "Nueva Característica" or "Estabilidad"]',
	badgeColor: '[Color Hex: #10b981 for core features, #3b82f6 for minor, #8b5cf6 for initial]',
	changes: [
		'Emoji-prefixed bullet points detailing the branch changes...'
	]
}
```

#### C. `src/routes/+page.svelte`
Update the version badge button in the copyright section of the footer:
```html
<button class="changelog-badge-btn" onclick={() => showChangelog = true}>vX.Y.Z</button>
```

---

## 🔒 Post-Bump Verification Loop
*   After editing all three files, Antigravity **MUST** invoke the **Complete Production Build Verification Skill**:
    *   Run `npx svelte-check` and ensure **0 errors, 0 warnings**.
    *   Run `npm run build` and ensure **successful compilation**.
