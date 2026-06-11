# RAG Sources

## High-Value Core Context
The following files must be indexed first as they define the project conventions and boundaries:
1. `.ai/context/project-brief.md`
2. `.ai/context/architecture.md`
3. `.ai/context/stack.yaml`
4. `.ai/rules/global-rules.md`

## High-Value Implementation Code
These files define the operational behavior and types of the application:
1. `src/lib/types.ts` (Core types schema)
2. `src/lib/rebalance.ts` (Core logic algorithm)
3. `src/lib/firebase.ts` (Auth/DB connection setup)
4. `vite.config.ts` (Build system settings)
5. `package.json` (Dependencies list)
