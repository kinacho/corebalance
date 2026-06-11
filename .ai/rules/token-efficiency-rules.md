# Token Efficiency Rules

- **Read only what is needed**: Do not inspect full folders or read huge files when checking a specific function.
- **Summarize before expanding**: Give quick high-level updates before going into deep detail.
- **Never reload long docs**: Refer to existing summaries or cached context where possible.
- **Prefer structured files**: Use YAML, checklists, or tables instead of prose.
- **Prefer targeted search**: Use specific symbol/function queries via search tools instead of reading full files.
- **Prefer diffs over whole files**: Output and read localized changes rather than full file replacements.
- **Split work by subtask**: Perform edits in incremental turns instead of huge compound steps.
- **Use English for operational prompts**: Keep system instructions in English to minimize token overhead.
- **Keep outputs concise**: Only provide necessary code blocks or details.
- **Ask for clarification only when blocking**: Make logical assumptions based on repo evidence before asking questions.
- **Refresh summaries**: Update `current-state.md` and related summaries after any meaningful changes to code.
