# Implementation Plan - Adaptive Retry

## Summary

This feature adds intelligent retry logic to the murmur8 pipeline via a new `src/retry.js` module. The module calculates failure rates from history, recommends strategies based on configurable thresholds, and applies prompt modifications when users accept recommended strategies. The implementation integrates with existing `src/history.js` for failure data and provides CLI commands for configuration management.

## Files to Create/Modify

| Path | Action | Purpose |
|------|--------|---------|
| `src/retry.js` | Create | Core retry logic: config management, failure rate calculation, strategy recommendation, prompt modification |
| `src/index.js` | Modify | Export retry module functions |
| `bin/cli.js` | Modify | Add `retry-config` CLI command with `set` and `reset` subcommands |

## Implementation Steps

1. **Create `src/retry.js` with config management** - Implement `getDefaultConfig()`, `readConfig()`, `writeConfig()`, `resetConfig()` functions for `.claude/retry-config.json`

2. **Add failure rate calculation** - Implement `calculateFailureRate(stage, history, windowSize)` that returns failure rate (0-1) for a stage over the recent window

3. **Add strategy recommendation logic** - Implement `recommendStrategy(stage, attemptCount, failureRate, config)` returning strategy name or "abort-recommended"

4. **Add prompt modification** - Implement `applyStrategy(strategy, originalPrompt)` that returns modified prompt based on strategy

5. **Add graceful degradation** - Wrap all file operations in try/catch; return defaults on corrupted/missing files; log warnings

6. **Add CLI commands to `bin/cli.js`** - Add `retry-config` (view), `retry-config set <key> <value>`, `retry-config reset` commands

7. **Export functions in `src/index.js`** - Export `readConfig`, `writeConfig`, `resetConfig`, `calculateFailureRate`, `recommendStrategy`, `applyStrategy`

8. **Run tests and iterate** - Execute `node --test test/feature_adaptive-retry.test.js` after each step; fix failures

## Key Functions

- `getDefaultConfig()` - Returns hardcoded default configuration object
- `readConfig()` - Reads `.claude/retry-config.json` or returns defaults if missing/corrupted
- `writeConfig(config)` - Writes config to file, creates `.claude/` directory if needed
- `resetConfig()` - Replaces config with defaults
- `calculateFailureRate(stage, history, windowSize)` - Calculates failure rate for stage over window
- `recommendStrategy(stage, attemptCount, failureRate, config)` - Returns recommended strategy name
- `applyStrategy(strategy, originalPrompt)` - Returns modified prompt or original if "retry"
- `shouldRetry(stage, featureSlug, history, config, attemptCount)` - Orchestrator entry point; returns recommendation object

## Risks/Questions

- **Rollback strategy is destructive**: Per story-prompt-modification.md:AC-6, `git checkout -- .` requires explicit confirmation before execution; implementation must surface this warning
- **History module dependency**: If `readHistoryFile()` returns `{ error: 'corrupted' }`, module must degrade gracefully per test T-SH-2
- **Strategy escalation boundary**: When `attemptCount - 1` exceeds strategy list length, use last strategy before switching to "abort-recommended"
