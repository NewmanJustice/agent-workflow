# Feature Specification — Validate Command

## 1. Feature Intent
**Why this feature exists.**

The `orchestr8 validate` command provides pre-flight checks to ensure the environment is correctly configured before running the `/implement-feature` pipeline. This addresses a common failure mode where users invoke the pipeline without required artifacts in place, leading to mid-pipeline failures that are harder to diagnose and recover from.

**Problem being addressed:**
- Pipeline failures mid-execution due to missing system spec, agent files, or skills
- Poor developer experience when prerequisites are unclear
- No visibility into "readiness" state before committing to a full pipeline run

**User need:**
- Developers need confidence that their project is correctly set up before invoking the pipeline
- Teams need actionable guidance when setup is incomplete

**How this supports the system purpose:**
- Aligns with the system's goal of reducing ambiguity and drift by enforcing explicit prerequisites
- Supports the "System spec gate" rule defined in the system specification (Section 7)
- Reduces failed pipeline runs by catching issues early

---

## 2. Scope

### In Scope
- New CLI command `orchestr8 validate` accessible via `bin/cli.js`
- Check: System spec exists at `.blueprint/system_specification/SYSTEM_SPEC.md`
- Check: Required directories exist (`.blueprint/`, `.business_context/`, `.claude/commands/`)
- Check: Agent spec files exist in `.blueprint/agents/` (AGENT_SPECIFICATION_ALEX.md, AGENT_BA_CASS.md, AGENT_TESTER_NIGEL.md, AGENT_DEVELOPER_CODEY.md)
- Check: Business context directory has at least one file (not empty)
- Check: Skills installed (`.claude/commands/implement-feature.md` exists)
- Check: Node.js version meets requirements (>=18)
- Success output: Print success message with checkmarks for each passed check
- Failure output: Print what is missing with actionable fix suggestions for each failed check
- Exit code: 0 on all checks pass, non-zero on any failure

### Out of Scope
- Validation of file contents (e.g., SYSTEM_SPEC.md is well-formed)
- Validation of business context quality or completeness
- Automatic remediation (the command reports issues, not fixes them)
- Network checks (e.g., can reach skills.sh)
- Validation of queue state or in-progress features

---

## 3. Actors Involved

### Human User (Developer)
- **Can do:** Invoke `orchestr8 validate` to check project readiness
- **Can do:** Review validation output to understand what is missing
- **Cannot do:** Auto-fix issues via this command (must run `init` or manually create files)

---

## 4. Behaviour Overview

**Happy-path behaviour:**
1. User runs `orchestr8 validate` in a project directory
2. Command performs all checks in sequence
3. Each check prints a status line (checkmark for pass, X for fail)
4. If all checks pass, prints overall success message and exits with code 0

**Failure behaviour:**
1. User runs `orchestr8 validate` in an incomplete project
2. Command performs all checks in sequence
3. Failed checks print X with a description of what is missing
4. After all checks, failed items include actionable fix suggestions (e.g., "Run `orchestr8 init` to create .blueprint directory")
5. Command exits with non-zero exit code

**User-visible outcomes:**
- Clear, scannable output showing pass/fail status for each prerequisite
- Actionable guidance for resolving failures
- Machine-parseable exit code for scripting/CI integration

---

## 5. State & Lifecycle Interactions

This feature is **state-inspecting only**. It does not create, transition, or modify any system state.

- **States inspected:** File system state (existence of files/directories), Node.js runtime version
- **States entered:** None
- **States exited:** None
- **States modified:** None

The command is idempotent and safe to run repeatedly without side effects.

---

## 6. Rules & Decision Logic

### R1: Directory Existence Check
- **Description:** Verify required directories exist
- **Inputs:** Directory paths (`.blueprint/`, `.business_context/`, `.claude/commands/`)
- **Outputs:** Pass/fail for each directory
- **Deterministic:** Yes

### R2: System Spec Existence Check
- **Description:** Verify SYSTEM_SPEC.md exists at expected path
- **Inputs:** Path `.blueprint/system_specification/SYSTEM_SPEC.md`
- **Outputs:** Pass/fail
- **Deterministic:** Yes

### R3: Agent Specs Existence Check
- **Description:** Verify all four agent specification files exist
- **Inputs:** Paths in `.blueprint/agents/` (AGENT_SPECIFICATION_ALEX.md, AGENT_BA_CASS.md, AGENT_TESTER_NIGEL.md, AGENT_DEVELOPER_CODEY.md)
- **Outputs:** Pass/fail, listing any missing files
- **Deterministic:** Yes

### R4: Business Context Non-Empty Check
- **Description:** Verify `.business_context/` contains at least one file
- **Inputs:** Directory listing of `.business_context/`
- **Outputs:** Pass/fail
- **Deterministic:** Yes

### R5: Skills Installed Check
- **Description:** Verify implement-feature skill is installed
- **Inputs:** Path `.claude/commands/implement-feature.md`
- **Outputs:** Pass/fail
- **Deterministic:** Yes

### R6: Node.js Version Check
- **Description:** Verify Node.js version is 18 or higher
- **Inputs:** `process.version`
- **Outputs:** Pass/fail with current version
- **Deterministic:** Yes

### R7: Exit Code Logic
- **Description:** Return exit code based on overall result
- **Inputs:** All check results
- **Outputs:** Exit code 0 if all pass, exit code 1 if any fail
- **Deterministic:** Yes

---

## 7. Dependencies

### System Components
- `fs` module for file system checks
- `process.version` for Node.js version check
- CLI routing in `bin/cli.js`

### Technical Dependencies
- Node.js >= 18 (the check itself should work on lower versions to report the failure)

---

## 8. Non-Functional Considerations

### Performance
- All checks are local file system operations; should complete in < 100ms

### Error Tolerance
- Command should not throw exceptions; all checks should be wrapped to handle missing paths gracefully

### User Experience
- Output should be colorized if terminal supports it (green checkmarks, red X marks)
- Output should be readable in non-color terminals (using ASCII fallback)

---

## 9. Assumptions & Open Questions

### Assumptions
- The four agent spec files have fixed names matching current convention
- `.business_context/` having any file (including README.md) counts as non-empty
- The Node.js version check should report failure but not crash on old versions

### Open Questions
- Should there be a `--json` flag for machine-readable output?
- Should there be a `--fix` flag that runs `init` if missing? (Deferred - out of scope)

---

## 10. Impact on System Specification

This feature **reinforces** existing system assumptions:
- Validates the prerequisites implied by "System spec gate" rule in Section 7
- Aligns with system boundary definition (CLI tooling in scope)
- Consistent with existing command patterns (`init`, `update`, `queue`)

No contradictions or tensions with the current system specification.

---

## 11. Handover to BA (Cass)

### Story Themes
1. **Core validation flow** - User runs validate and sees results
2. **Success path** - All checks pass, user sees green checkmarks
3. **Failure path with guidance** - Checks fail, user sees actionable fixes
4. **Node.js version edge case** - Running on unsupported Node version

### Expected Story Boundaries
- Each check type could be a separate acceptance criterion within a single story
- Success/failure output formatting is a story concern
- Exit codes are a story concern (affects CI integration)

### Areas Needing Careful Story Framing
- The distinction between "check failed" and "command error" (the command itself should not fail/throw, even if checks fail)
- How to phrase fix suggestions to be helpful without being prescriptive

---

## 12. Change Log (Feature-Level)
| Date | Change | Reason | Raised By |
|------|--------|--------|-----------|
| 2026-02-24 | Initial feature specification | New feature request for pre-flight validation | Alex |
