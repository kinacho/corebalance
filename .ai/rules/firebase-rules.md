# Firebase Rules

- **Client initialization**: Initialize Firestore and Auth conditionally depending on the presence of API Keys.
- **No Credentials Committing**: Never add config values or credentials to source control.
- **Auth Persistence**: Maintain local browser persistence (`browserLocalPersistence`).
- **Data boundaries**: Only write user documents inside personal user paths in Firestore when the user is logged in. Use local IndexedDB as the primary source of truth.
