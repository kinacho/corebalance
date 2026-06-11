# Security Rules

- **Data Privacy**: Keep portfolio values and assets in client-side IndexedDB.
- **Credential Storage**: Use environment variables (`KV_REST_API_*`, `VITE_FIREBASE_*`).
- **Input Sanitization**: Sanitize uploaded CSV files or manual transaction notes before parsing or displaying to prevent XSS.
- **Firestore Access**: Ensure `firestore.rules` enforces authentication check before allowing reads/writes to user sync documents.
