# User Story: Pipeline Integration

## Story

**As a** developer completing an interactive session,
**I want** the interactive mode to integrate seamlessly with the existing pipeline infrastructure,
**so that** downstream agents receive proper handoffs and the pipeline can resume or record history as expected.

## Acceptance Criteria

### AC-1: Spec File Output

**Given** an interactive session completes successfully (via `/approve` on final section or `/done`)
**When** Alex finalizes the spec
**Then** FEATURE_SPEC.md is written to `{FEAT_DIR}/FEATURE_SPEC.md`
**And** the file includes all completed sections
**And** skipped sections are marked as "TBD"
**And** the file includes a note: "Created via interactive session"

### AC-2: Handoff Artifact

**Given** an interactive session completes successfully
**When** Alex writes the spec file
**Then** Alex also produces `handoff-alex.md` in the feature directory
**And** the handoff includes key decisions, files created, and open questions

### AC-3: Queue Update

**Given** an interactive session completes successfully
**When** the pipeline continues
**Then** the queue is updated with the feature moving from `alexQueue` to `cassQueue`
**And** `current.stage` reflects "cass" (or the next applicable stage)

### AC-4: History Recording

**Given** an interactive session completes (success or abort)
**When** history is recorded (unless `--no-history` flag present)
**Then** the `pipeline-history.json` entry includes `mode: "interactive"`
**And** the entry includes question count, revision count, and session duration

### AC-5: Pause After Alex

**Given** an interactive session completes successfully
**And** `--pause-after=alex` flag was provided
**When** Alex finishes
**Then** the pipeline pauses before spawning Cass
**And** user can review the spec before continuing

### AC-6: Continue to Downstream Agents

**Given** an interactive session completes successfully
**And** `--pause-after=alex` flag was NOT provided
**When** Alex finishes
**Then** the pipeline continues automatically
**And** Cass is spawned with the produced FEATURE_SPEC.md as input

## Out of Scope

- Changes to Cass, Nigel, or Codey agent behaviour
- Parallel pipeline execution
- Multi-feature batch processing

## References

- Feature Spec: `.blueprint/features/feature_interactive-alex/FEATURE_SPEC.md` (Section 6)
- System Spec: `.blueprint/system_specification/SYSTEM_SPEC.md` (Sections 6-7)
