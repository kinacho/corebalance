# Backend Rules

- **API Route Convention**: Implement backend paths in `src/routes/api/` with `+server.ts` handlers.
- **Upstash Caching**: Always query the local cache or Upstash Redis before hitting external rate-limited endpoints (like Yahoo Finance).
- **Error Handling**: Gracefully intercept network failures and return clean JSON error payloads (`errors: string[]`).
- **Hook execution**: Server-side hooks in `hooks.server.ts` must remain lightweight to avoid blocking rendering operations.
