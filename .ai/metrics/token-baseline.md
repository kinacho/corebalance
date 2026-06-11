# Token Baseline

## Baseline Targets
- **Max context per turn**: 15,000 tokens (for simple edits/runs).
- **Max prompt size**: 8,000 tokens.
- **Max response size**: 1,000 tokens.

## Optimization Indicators
- **Doc Reloading**: Should be 0. Do not load `architecture.md` or templates repeatedly during the same chat thread.
- **Terminal Noise**: Limit test logging output using specific file targets instead of dumping global test output.
- **Redundant Code Reading**: Reduce files read per turn down to the absolute minimal list of targets.
