# User Story: Interactive System Spec Creation

## Story

**As a** developer initializing a new project without a system specification,
**I want** Alex to guide me through creating a SYSTEM_SPEC.md interactively,
**so that** I establish the project's boundaries and constraints before creating feature specs.

## Acceptance Criteria

### AC-1: System Spec Auto-Detection

**Given** a user invokes `/implement-feature "my-feature"`
**And** `.blueprint/system_specification/SYSTEM_SPEC.md` does not exist
**When** the pipeline checks prerequisites
**Then** interactive mode activates for system spec creation (not feature spec)

### AC-2: System Spec Session Flow

**Given** interactive system spec mode is active
**When** Alex starts the session
**Then** Alex asks about: purpose, actors, system boundaries, and governing rules
**And** Alex drafts SYSTEM_SPEC.md sections incrementally
**And** the same session commands apply (`/approve`, `/change`, `/skip`, `/restart`, `/abort`, `/done`)

### AC-3: System Spec Output Location

**Given** an interactive system spec session completes successfully
**When** Alex writes the spec
**Then** the file is written to `.blueprint/system_specification/SYSTEM_SPEC.md`
**And** the file follows the SYSTEM_SPEC template structure

### AC-4: Pipeline Gate Satisfied

**Given** SYSTEM_SPEC.md is created via interactive session
**When** the user re-invokes `/implement-feature "my-feature"`
**Then** the system spec gate passes
**And** the pipeline proceeds to feature spec creation (interactive or autonomous)

### AC-5: System Spec Before Feature Spec

**Given** a user invokes `/implement-feature "my-feature" --interactive`
**And** SYSTEM_SPEC.md does not exist
**When** the pipeline routing logic runs
**Then** system spec interactive session runs first
**And** only after system spec is complete does feature spec interactive session begin

## Out of Scope

- Updating existing SYSTEM_SPEC.md interactively (only creation)
- Skipping system spec gate entirely
- System spec versioning or change tracking

## References

- Feature Spec: `.blueprint/features/feature_interactive-alex/FEATURE_SPEC.md` (Section 4.1, Open Question 2)
- System Spec: `.blueprint/system_specification/SYSTEM_SPEC.md` (Section 7 - System spec gate)
