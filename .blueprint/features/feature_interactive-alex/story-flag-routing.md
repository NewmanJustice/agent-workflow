# User Story: Flag Parsing & Mode Routing

## Story

**As a** developer using orchestr8,
**I want** the `/implement-feature` command to detect when interactive mode is needed and route accordingly,
**so that** I get a collaborative spec experience for new/unclear features without manual flag management.

## Acceptance Criteria

### AC-1: Explicit Interactive Flag

**Given** a user invokes `/implement-feature "my-feature" --interactive`
**When** the command parses flags
**Then** interactive mode is activated regardless of existing spec files

### AC-2: Auto-Detect Missing System Spec

**Given** a user invokes `/implement-feature "my-feature"` without `--interactive`
**And** `.blueprint/system_specification/SYSTEM_SPEC.md` does not exist
**When** the pipeline routing logic runs
**Then** interactive mode is activated for system spec creation

### AC-3: Auto-Detect Missing Feature Spec

**Given** a user invokes `/implement-feature "my-feature"` without `--interactive`
**And** `SYSTEM_SPEC.md` exists
**And** `.blueprint/features/feature_my-feature/FEATURE_SPEC.md` does not exist
**When** the pipeline routing logic runs
**Then** interactive mode is activated for feature spec creation

### AC-4: Autonomous Mode When Specs Exist

**Given** a user invokes `/implement-feature "my-feature"` without `--interactive`
**And** both `SYSTEM_SPEC.md` and `FEATURE_SPEC.md` exist
**When** the pipeline routing logic runs
**Then** Alex runs in autonomous (non-interactive) mode

### AC-5: Combined Flags

**Given** a user invokes `/implement-feature "my-feature" --interactive --pause-after=alex`
**When** the command parses flags
**Then** interactive mode is activated
**And** the pipeline will pause after Alex completes (before Cass)

## Out of Scope

- `--no-interactive` flag to force autonomous mode (users can create placeholder specs)
- Interactive modes for agents other than Alex
- Flag validation errors (handled by existing CLI parsing)

## References

- Feature Spec: `.blueprint/features/feature_interactive-alex/FEATURE_SPEC.md` (Section 4.1)
