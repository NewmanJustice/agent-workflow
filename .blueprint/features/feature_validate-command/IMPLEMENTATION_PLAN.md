# Implementation Plan — Validate Command

## Summary

Implement a new `murmur8 validate` CLI command that performs pre-flight checks for directory existence, file presence, and Node.js version. The command outputs pass/fail status for each check with colorized indicators, provides actionable fix suggestions for failures, and returns appropriate exit codes (0 for success, 1 for failure).

---

## Files to Create/Modify

| Path | Action | Purpose |
|------|--------|---------|
| `src/validate.js` | Create | Core validation logic with `validate()`, `formatOutput()`, and `checkNodeVersion()` exports |
| `src/index.js` | Modify | Export validate module for library consumers |
| `bin/cli.js` | Modify | Add `validate` command routing |

---

## Implementation Steps

1. **Create `src/validate.js` with check functions**
   - Implement `checkDirectories()` for `.blueprint/`, `.business_context/`, `.claude/commands/`
   - Implement `checkSystemSpec()` for `.blueprint/system_specification/SYSTEM_SPEC.md`
   - Implement `checkAgentSpecs()` for the four agent files in `.blueprint/agents/`
   - Implement `checkBusinessContext()` to verify directory is non-empty
   - Implement `checkSkillsInstalled()` for `.claude/commands/implement-feature.md`
   - Implement `checkNodeVersion()` exported separately for tests, parsing `process.version`

2. **Implement main `validate()` function**
   - Run all checks sequentially, collecting results in an array
   - Each check returns `{ name, passed, message, fix?, detectedVersion? }`
   - Compute `success` (all passed) and `exitCode` (0 or 1)
   - Return `{ success, exitCode, checks }`

3. **Implement `formatOutput()` function**
   - Accept result object and color flag (detect via `process.stdout.isTTY`)
   - Use `✓`/`✗` for color terminals, `[PASS]`/`[FAIL]` for ASCII fallback
   - Apply green/red ANSI codes when color is enabled
   - Include fix suggestions after failed checks
   - Print overall success/failure summary at end

4. **Add CLI routing in `bin/cli.js`**
   - Import `validate` and `formatOutput` from `src/validate.js`
   - Add `validate` command that runs validation, prints output, and calls `process.exit(result.exitCode)`

5. **Export from `src/index.js`**
   - Add `validate` to module exports for programmatic usage

6. **Run tests and iterate**
   - Execute `node --test test/feature_validate-command.test.js`
   - Fix any failing assertions

---

## Risks/Questions

- **Color detection**: Tests mock TTY state; implementation should use `process.stdout.isTTY` or accept a parameter for testability
- **Agent file names**: Tests expect exact names (AGENT_SPECIFICATION_ALEX.md, AGENT_BA_CASS.md, AGENT_TESTER_NIGEL.md, AGENT_DEVELOPER_CODEY.md) - verify these match production
- **Node version parsing**: Use `parseInt(process.version.slice(1).split('.')[0], 10)` to extract major version safely
