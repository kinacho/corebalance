# RAG Retrieval Policy

- **Top-K Defaults**:
  - `k = 3` for code fragments.
  - `k = 1` for architecture or rules mapping.
- **Reranking Guidance**:
  - Prioritize chunks from files inside `src/lib/` when searching for business logic questions.
  - Prioritize chunks from `src/routes/` when searching for visual bugs or rendering issues.
- **Context Boundaries**: Never inject more than 4000 tokens of retrieved documentation into an active prompt to prevent context pollution.
