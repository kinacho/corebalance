# Windows Shell Rules

- **Forbid grep-first behavior**: Never run `grep` directly. It will fail on standard Windows PowerShell setups.
- **Command preference order**:
  1. `rg` (ripgrep)
  2. `findstr`
  3. PowerShell `Select-String`
  4. PowerShell `Get-ChildItem`
  5. `dir`
- **Detect tools first**: Run a quick validation command to check tool availability before executing a search.
- **PowerShell-compatible examples**:
  - Finding text in files: `Get-ChildItem -Recurse -Filter "*.ts" | Select-String "rebalance"`
  - Finding a file: `Get-ChildItem -Recurse -Filter "rebalance.ts"`
  - Viewing environment variables: `$env:KV_REST_API_URL`
- **Path structure**: Use backslashes (`\`) for file targets in Windows command arguments, or use PowerShell-style forward slashes (`/`) which are resolved automatically by the shell.
