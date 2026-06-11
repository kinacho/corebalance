# RTK for Windows in CoreBalance

## Purpose
Configures command cleaning, allows safe test execution, and blocks unauthorized Git commands to optimize token consumption in Antigravity.

## Structure
- `config.toml`: Sets basic layout cleaning rules.
- `command-allowlist.txt`: Safe command targets (e.g. `npm run check`, `vitest`).
- `command-denylist.txt`: Forbids Git writes and Unix commands.
