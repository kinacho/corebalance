# RAG Chunking Policy

- **Core Context Files**: No chunking. Always load these files fully when accessed.
- **Source Code Files**:
  - Chunk size: ~500 tokens / 2000 characters.
  - Overlap: 50 tokens / 200 characters.
  - Metadata: Include file path, line numbers, exports (functions/classes) present in the chunk.
- **Prioritization**:
  1. Types (`src/lib/types.ts`)
  2. Calculation algorithms (`src/lib/*.ts`)
  3. UI Views (`src/routes/*.svelte`)
