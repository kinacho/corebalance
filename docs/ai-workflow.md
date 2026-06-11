# AI Workflow in CoreBalance

This guide defines how AI agents and developers operate within this repository on Windows.

## 1. Directory Structure & Canonical Context
- **Context Maps**: Located in `.ai/context/`. Read `project-brief.md`, `architecture.md`, and `stack.yaml` first.
- **Rules & Playbooks**: Located in `.ai/rules/` and `.ai/skills/`. They direct execution.
- **Workflow State**: Summaries in `.ai/summaries/` act as cached snapshots of code state.

## 2. Starting a Task
1. Inspect `.ai/summaries/current-state.md` to identify the stack.
2. Select the matching task template in `.ai/tasks/` (e.g., `implement-feature.md`).
3. If it requires significant architecture changes, create/update the implementation plan.

## 3. Summaries vs Full Files
- **Summaries**: Use `.ai/summaries/*` first to get context.
- **Full Files**: View source files only when you target a specific logic replacement. Prefer line-specific reads over reading full bodies.

## 4. Updating Documentation
- Update `current-state.md` and `entities.yaml` immediately when models, routes, or configurations are updated. Keep changes brief and structured.

## 5. RTK & RAG Connection
- **RTK (Runtime Toolkit)**: Filters terminal logs (using `.rtk/config.toml`) to minimize token context pollution.
- **RAG Policy**: Defines vector source limits (listed in `.ai/rag/sources.md`) to pull only relevant components.

## 6. Windows Shell Limitations
- **No grep/sed**: Do not assume Unix shell capabilities.
- **Command priority**: Use `rg` -> `findstr` -> PowerShell `Select-String`.
- Provide Windows-safe script execution suggestions.
