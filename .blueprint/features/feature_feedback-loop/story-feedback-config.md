# Story — Feedback Configuration

## User Story

As a **developer**, I want **CLI commands to view and modify feedback thresholds** so that **I can tune quality gate sensitivity based on my project's needs**.

---

## Context / Scope

- Per FEATURE_SPEC.md:Section 7, configuration is stored in `.claude/feedback-config.json`
- Per FEATURE_SPEC.md:Section 7, new CLI commands: `murmur8 feedback-config` and `murmur8 feedback-config set <key> <value>`
- Parallel track to quality gates — configuration can be set independently

---

## Acceptance Criteria

**AC-1 — View feedback configuration**
- Given the user runs `murmur8 feedback-config`,
- When the command executes,
- Then the current configuration is displayed including:
  - `minRatingThreshold` (default: 3.0)
  - `enabled` (default: true)
  - Any custom issue-to-strategy mappings

**AC-2 — Set threshold value**
- Given the user runs `murmur8 feedback-config set minRating <value>`,
- When the value is a number between 1.0 and 5.0,
- Then the threshold is updated in `.claude/feedback-config.json`,
- And a confirmation message is displayed.

**AC-3 — Invalid threshold rejected**
- Given the user runs `murmur8 feedback-config set minRating <value>`,
- When the value is outside 1.0-5.0 range or not a number,
- Then an error message is displayed,
- And the configuration is not modified.

**AC-4 — Enable/disable feedback system**
- Given the user runs `murmur8 feedback-config set enabled <true|false>`,
- When the command executes,
- Then the `enabled` flag is updated,
- And when disabled, feedback collection and quality gates are skipped.

**AC-5 — Configuration file created on first set**
- Given `.claude/feedback-config.json` does not exist,
- When the user runs a `feedback-config set` command,
- Then the file is created with default values plus the specified override.

**AC-6 — Configuration file is gitignored**
- Given a project is initialised with murmur8,
- When feedback configuration is created,
- Then `.claude/feedback-config.json` is included in gitignore patterns.

---

## Out of Scope

- Per-agent threshold configuration (single global threshold for MVP)
- Custom issue code definition via CLI
- Configuration import/export
