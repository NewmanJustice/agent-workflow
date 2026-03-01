# Story — Record Pipeline Execution

## User story

As a developer using murmur8, I want pipeline execution data to be automatically recorded during runs so that I have historical data for later analysis.

---

## Context / scope

- Applies to all pipeline invocations via `/implement-feature`
- Recording occurs at stage boundaries: alex, cass, nigel, codey-plan, codey-implement
- Data persisted to `.claude/pipeline-history.json`
- Per FEATURE_SPEC.md:Section 5 (State & Lifecycle), recording creates new history entries without altering pipeline flow

---

## Acceptance criteria

**AC-1 — History entry created on pipeline completion**
- Given I invoke `/implement-feature "my-feature"`,
- When the pipeline completes successfully,
- Then a history entry is appended to `.claude/pipeline-history.json` with status `success`.

**AC-2 — History entry created on pipeline failure**
- Given I invoke `/implement-feature "my-feature"`,
- When a stage fails during execution,
- Then a history entry is appended with status `failed` and the failing stage recorded.

**AC-3 — History entry created on pipeline pause**
- Given I invoke `/implement-feature "my-feature" --pause-after=cass`,
- When the pipeline pauses after the specified stage,
- Then a history entry is appended with status `paused` and stages completed up to the pause point.

**AC-4 — Timestamps recorded per stage**
- Given a pipeline run completes (success, failure, or pause),
- When the history entry is created,
- Then each completed stage has `startedAt` and `completedAt` timestamps in ISO 8601 format.

**AC-5 — History file created if absent**
- Given `.claude/pipeline-history.json` does not exist,
- When a pipeline run completes,
- Then the file is created with an array containing the single history entry.

**AC-6 — Recording failure does not abort pipeline**
- Given the history file cannot be written (e.g., permissions error),
- When a pipeline run completes,
- Then a warning is logged but the pipeline completes normally.

---

## History entry structure

```json
{
  "slug": "my-feature",
  "status": "success" | "failed" | "paused",
  "startedAt": "2026-02-24T10:00:00.000Z",
  "completedAt": "2026-02-24T10:15:00.000Z",
  "stages": {
    "alex": { "startedAt": "...", "completedAt": "...", "durationMs": 120000 },
    "cass": { "startedAt": "...", "completedAt": "...", "durationMs": 90000 },
    ...
  },
  "failedStage": "nigel" | null
}
```

---

## Out of scope

- Real-time metrics streaming during execution
- Detailed error logs or stack traces (only stage-level status)
- Modifying past history entries
- History file rotation or size management
