# Story — Run Validation Command

## User story
As a developer, I want to run `murmur8 validate` in my project directory so that I can check whether my environment is correctly configured before running the pipeline.

---

## Context / scope
- Developer using murmur8 CLI
- Command can be run in any directory (initialized or not)
- Route: `murmur8 validate` via `bin/cli.js`
- This is the primary entry point for the validate feature

See feature spec: `.blueprint/features/feature_validate-command/FEATURE_SPEC.md`

---

## Acceptance criteria

**AC-1 — Command is available**
- Given I have murmur8 installed,
- When I run `murmur8 validate`,
- Then the command executes without throwing an exception.

**AC-2 — Checks execute in sequence**
- Given I run `murmur8 validate`,
- When the command executes,
- Then all validation checks are performed:
  - Directory existence (`.blueprint/`, `.business_context/`, `.claude/commands/`)
  - System spec existence (`.blueprint/system_specification/SYSTEM_SPEC.md`)
  - Agent spec files existence (4 files in `.blueprint/agents/`)
  - Business context non-empty check
  - Skills installed check (`.claude/commands/implement-feature.md`)
  - Node.js version check (>=18)

**AC-3 — Each check produces a status line**
- Given I run `murmur8 validate`,
- When each check completes,
- Then a status line is printed showing pass or fail for that check.

**AC-4 — Command completes without crashes**
- Given any combination of missing/present files,
- When I run `murmur8 validate`,
- Then the command completes gracefully (does not throw exceptions)
- And all checks are wrapped to handle missing paths.

**AC-5 — Idempotent execution**
- Given I run `murmur8 validate` multiple times,
- When each execution completes,
- Then no files are created, modified, or deleted
- And each run produces the same output for the same state.

---

## Out of scope
- Validation of file contents (e.g., SYSTEM_SPEC.md is well-formed)
- Automatic remediation of issues
- Network checks
- Queue state validation
