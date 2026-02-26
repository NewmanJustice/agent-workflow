# Test Specification: Interactive Alex

## Understanding

Interactive Alex adds a conversational mode to the specification agent. It triggers automatically when SYSTEM_SPEC.md or FEATURE_SPEC.md is missing, or explicitly via `--interactive` flag. Users interact via session commands (`/approve`, `/change`, `/skip`, `/restart`, `/abort`, `/done`). Alex drafts spec sections incrementally, asks clarifying questions (2-4 per batch), and produces the same artifacts as autonomous mode.

Key behaviors: flag parsing/routing, session command handling, iterative drafting state machine, pipeline integration (queue, history, handoff), system spec creation flow.

## AC to Test ID Mapping

### Story: Flag Routing (story-flag-routing.md)

| AC | Test ID | Scenario |
|----|---------|----------|
| AC-1 | T-FR-1 | `--interactive` flag activates interactive mode |
| AC-2 | T-FR-2 | Missing SYSTEM_SPEC.md triggers interactive mode |
| AC-3 | T-FR-3 | Missing FEATURE_SPEC.md triggers interactive mode |
| AC-4 | T-FR-4 | Both specs exist → autonomous mode |
| AC-5 | T-FR-5 | `--interactive --pause-after=alex` both flags work |

### Story: Session Lifecycle (story-session-lifecycle.md)

| AC | Test ID | Scenario |
|----|---------|----------|
| AC-1 | T-SL-1 | Session init reads context, shows opening prompt |
| AC-2 | T-SL-2 | `/approve` or `yes` marks section complete |
| AC-3 | T-SL-3 | `/change <feedback>` triggers revision |
| AC-4 | T-SL-4 | `/skip` marks section TBD, proceeds |
| AC-5 | T-SL-5 | `/restart` discards draft, restarts section |
| AC-6 | T-SL-6 | `/abort` exits without writing spec |
| AC-7 | T-SL-7 | `/done` finalizes with complete + TBD sections |

### Story: Iterative Drafting (story-iterative-drafting.md)

| AC | Test ID | Scenario |
|----|---------|----------|
| AC-1 | T-ID-1 | Context gathering summarizes intent, identifies gaps |
| AC-2 | T-ID-2 | Clarifying questions: 2-4 batch, specific, waits |
| AC-3 | T-ID-3 | Section-by-section drafting order (Intent→Scope→...) |
| AC-4 | T-ID-4 | Revision incorporates feedback, re-presents |
| AC-5 | T-ID-5 | Progress indication shows complete vs remaining |
| AC-6 | T-ID-6 | Responses under 200 words |

### Story: Pipeline Integration (story-pipeline-integration.md)

| AC | Test ID | Scenario |
|----|---------|----------|
| AC-1 | T-PI-1 | Spec file written with sections + TBD + note |
| AC-2 | T-PI-2 | handoff-alex.md produced |
| AC-3 | T-PI-3 | Queue updated alexQueue→cassQueue |
| AC-4 | T-PI-4 | History includes mode, question/revision counts |
| AC-5 | T-PI-5 | `--pause-after=alex` pauses before Cass |
| AC-6 | T-PI-6 | No pause flag → continues to Cass |

### Story: System Spec Creation (story-system-spec-creation.md)

| AC | Test ID | Scenario |
|----|---------|----------|
| AC-1 | T-SS-1 | Missing SYSTEM_SPEC triggers system spec mode |
| AC-2 | T-SS-2 | System spec session asks about purpose/actors/etc |
| AC-3 | T-SS-3 | Output to .blueprint/system_specification/ |
| AC-4 | T-SS-4 | Created spec satisfies gate for re-invocation |
| AC-5 | T-SS-5 | System spec completes before feature spec begins |

## Assumptions

- `src/interactive.js` module will be created to handle session state machine
- Routing logic changes will be in SKILL.md and/or `src/orchestrator.js`
- Session state is in-memory (no persistence testing needed)
- Mock conversation loop for unit tests; no actual Claude API calls
- Word count (200 limit) is for Alex responses, not user input
- "TBD" is literal string marker for skipped sections
