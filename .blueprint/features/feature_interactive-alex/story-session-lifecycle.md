# User Story: Interactive Session Lifecycle

## Story

**As a** developer entering interactive mode,
**I want** a clear session lifecycle with explicit commands for controlling the conversation,
**so that** I can navigate the spec creation process efficiently and exit gracefully when needed.

## Acceptance Criteria

### AC-1: Session Initialization

**Given** interactive mode is activated (explicit flag or auto-detect)
**When** the session starts
**Then** Alex reads system spec (if exists), business context, and feature template
**And** Alex presents an opening prompt: "Describe the feature you want to build. What problem does it solve and for whom?"

### AC-2: Approve Command

**Given** an interactive session is active
**And** Alex has presented a draft section
**When** the user responds with `/approve` or `yes`
**Then** the current section is marked complete
**And** Alex proceeds to the next section

### AC-3: Change Command

**Given** an interactive session is active
**And** Alex has presented a draft section
**When** the user responds with `/change <feedback>`
**Then** Alex revises the current section based on the feedback
**And** Alex presents the revised draft for approval

### AC-4: Skip Command

**Given** an interactive session is active
**And** Alex has presented a draft section
**When** the user responds with `/skip`
**Then** the current section is marked as "TBD" in the spec
**And** Alex proceeds to the next section

### AC-5: Restart Command

**Given** an interactive session is active
**And** Alex is working on a section
**When** the user responds with `/restart`
**Then** Alex discards the current section draft
**And** Alex starts the section from scratch with fresh questions

### AC-6: Abort Command

**Given** an interactive session is active
**When** the user responds with `/abort`
**Then** the session terminates immediately
**And** no spec file is written to disk
**And** the pipeline exits without proceeding to downstream agents

### AC-7: Done Command

**Given** an interactive session is active
**And** at least Intent, Scope, and Actors sections are complete or skipped
**When** the user responds with `/done`
**Then** Alex finalizes the spec with completed sections
**And** skipped sections are marked as "TBD"
**And** the spec file is written to disk

## Out of Scope

- Session persistence between interrupted sessions
- Timeout handling (session continues until user acts)
- Multi-user concurrent sessions

## References

- Feature Spec: `.blueprint/features/feature_interactive-alex/FEATURE_SPEC.md` (Section 4.4)
