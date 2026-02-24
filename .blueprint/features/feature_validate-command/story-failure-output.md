# Story — Validation Failure Output

## User story
As a developer, I want to see what is missing and how to fix it when validation checks fail so that I can resolve issues and get my project ready for the pipeline.

---

## Context / scope
- Developer using orchestr8 CLI
- Project is missing one or more required artifacts
- This story covers failure output and actionable guidance

See feature spec: `.blueprint/features/feature_validate-command/FEATURE_SPEC.md`

---

## Acceptance criteria

**AC-1 — X mark displayed for failed checks**
- Given one or more required files/directories are missing,
- When I run `orchestr8 validate`,
- Then each failed check displays an X indicator.

**AC-2 — Colorized failure output when supported**
- Given my terminal supports color output,
- When I run `orchestr8 validate` and checks fail,
- Then X marks are displayed in red.

**AC-3 — Description of what is missing**
- Given a check fails,
- When the status line is printed,
- Then it includes a description of what is missing (e.g., "Missing: .blueprint/system_specification/SYSTEM_SPEC.md").

**AC-4 — Actionable fix suggestions**
- Given one or more checks fail,
- When all checks have completed,
- Then actionable fix suggestions are displayed:
  - Missing `.blueprint/` directory: "Run `orchestr8 init` to initialize project"
  - Missing agent specs: "Run `orchestr8 init` to create agent specification files"
  - Missing skills: "Run `orchestr8 init` to install required skills"
  - Empty business context: "Add at least one file to `.business_context/` directory"
  - Node.js version: "Upgrade Node.js to version 18 or higher"

**AC-5 — Exit code non-zero on failure**
- Given one or more validation checks fail,
- When the command completes,
- Then the process exits with a non-zero exit code (1)
- And this exit code can be used in scripts/CI pipelines to detect failures.

**AC-6 — All checks still run on failure**
- Given the first check fails,
- When I run `orchestr8 validate`,
- Then all remaining checks are still executed
- And a complete picture of missing items is shown.

---

## Out of scope
- `--fix` flag to automatically remediate issues
- Prioritization of which issues to fix first
- JSON output format (deferred)
