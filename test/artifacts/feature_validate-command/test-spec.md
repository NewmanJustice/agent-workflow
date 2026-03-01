# Test Specification - Validate Command

## Understanding

The `murmur8 validate` command performs pre-flight checks to ensure the environment is correctly configured before running the pipeline. It checks for required directories, files, and Node.js version, providing pass/fail status with actionable fix suggestions. The command is idempotent, does not modify state, and returns exit code 0 on success, 1 on failure.

Key behaviors: sequential checks, graceful error handling, colorized output (with ASCII fallback), and machine-parseable exit codes for CI integration.

---

## AC to Test ID Mapping

### Story: Run Validation (story-run-validation.md)

| AC | Test ID | Scenario |
|----|---------|----------|
| AC-1 | T-RV-1.1 | Command executes without throwing exception |
| AC-2 | T-RV-2.1 | All six validation checks are performed |
| AC-3 | T-RV-3.1 | Each check produces a status line |
| AC-4 | T-RV-4.1 | Command completes gracefully with missing paths |
| AC-4 | T-RV-4.2 | Command completes gracefully with all paths missing |
| AC-5 | T-RV-5.1 | Multiple runs produce same output (idempotent) |
| AC-5 | T-RV-5.2 | No files created/modified by validate |

### Story: Success Output (story-success-output.md)

| AC | Test ID | Scenario |
|----|---------|----------|
| AC-1 | T-SO-1.1 | Checkmark displayed for passed checks |
| AC-2 | T-SO-2.1 | Green color when terminal supports it |
| AC-3 | T-SO-3.1 | ASCII fallback for non-color terminals |
| AC-4 | T-SO-4.1 | Overall success message when all pass |
| AC-5 | T-SO-5.1 | Exit code 0 when all checks pass |

### Story: Failure Output (story-failure-output.md)

| AC | Test ID | Scenario |
|----|---------|----------|
| AC-1 | T-FO-1.1 | X mark displayed for failed checks |
| AC-2 | T-FO-2.1 | Red color for failures when supported |
| AC-3 | T-FO-3.1 | Description of what is missing in output |
| AC-4 | T-FO-4.1 | Fix suggestion for missing .blueprint |
| AC-4 | T-FO-4.2 | Fix suggestion for missing agent specs |
| AC-4 | T-FO-4.3 | Fix suggestion for missing skills |
| AC-4 | T-FO-4.4 | Fix suggestion for empty business context |
| AC-4 | T-FO-4.5 | Fix suggestion for Node.js version |
| AC-5 | T-FO-5.1 | Exit code 1 when any check fails |
| AC-6 | T-FO-6.1 | All checks run even if first fails |

### Story: Node.js Version Check (story-node-version-check.md)

| AC | Test ID | Scenario |
|----|---------|----------|
| AC-1 | T-NV-1.1 | Pass indicator for Node.js 18+ |
| AC-2 | T-NV-2.1 | Fail indicator for Node.js < 18 |
| AC-2 | T-NV-2.2 | Current version shown in failure output |
| AC-3 | T-NV-3.1 | Command does not crash on old Node |
| AC-4 | T-NV-4.1 | Upgrade guidance in fix suggestions |
| AC-5 | T-NV-5.1 | Version detected from process.version |

---

## Key Assumptions

- Validate module will be at `src/validate.js` and export a `validate()` function
- Validate will be added to CLI routing in `bin/cli.js`
- Color detection uses `process.stdout.isTTY` or similar mechanism
- Node.js version parsing uses `process.version` string (e.g., "v18.0.0")
- Tests will mock file system and process.version where needed
- Agent spec files: AGENT_SPECIFICATION_ALEX.md, AGENT_BA_CASS.md, AGENT_TESTER_NIGEL.md, AGENT_DEVELOPER_CODEY.md
