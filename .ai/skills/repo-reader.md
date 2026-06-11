# Skill: Repo Reader

## Purpose
Quickly inspect the repository structure and locate configuration parameters or relevant files.

## Inputs
- Directory path or search term.

## Workflow
1. List parent directory using `list_dir` or native Windows tools.
2. Read main config files (`package.json`, `svelte.config.js`).
3. Query code patterns if needed using `rg` or PowerShell fallback.

## Output Format
- YAML checklist or markdown table listing folders, files, and detected setups.

## Token Pitfalls to Avoid
- Do not read full file contents when listing directory layout.
- Avoid recursive directory listing of `node_modules` or `.svelte-kit`.

## When Not to Use
- Do not use when searching for specific runtime errors or bugs inside one function.
