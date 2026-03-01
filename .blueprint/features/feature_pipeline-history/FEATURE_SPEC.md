# Feature Specification — Pipeline History

## 1. Feature Intent

**Why this feature exists.**

- **Problem being addressed:** Currently, murmur8 provides no visibility into historical pipeline executions. Users cannot see which features have been processed, how long each stage took, or identify patterns in failures.
- **User need:** Developers want to understand pipeline performance over time, identify bottlenecks, and diagnose recurring failures. This supports continuous improvement of the feature development process.
- **System purpose alignment:** Per SYSTEM_SPEC.md:Section 8 (Cross-Cutting Concerns:Observability), the system aims for observability via queue status and agent summaries. This feature extends observability to historical data, enabling retrospective analysis.

> This feature reinforces the system's observability goals without altering core pipeline behaviour.

---

## 2. Scope

### In Scope

- Recording execution metrics for each pipeline run (start/end times, duration per stage, success/failure)
- Persisting history to a JSON file (`.claude/pipeline-history.json`)
- New CLI command `murmur8 history` with subcommands and flags
- Display of recent runs, aggregate statistics, and failure analysis
- Clearing history via CLI

### Out of Scope

- Real-time monitoring or streaming metrics
- Integration with external monitoring systems (Prometheus, Grafana, etc.)
- Exporting history to formats other than JSON
- History synchronisation across machines or repositories
- Detailed error logs or stack traces (only stage-level failure status)

---

## 3. Actors Involved

### Human User

- **Can do:** View pipeline history via CLI; view aggregate statistics; clear history
- **Cannot do:** Modify individual history entries; replay failed pipelines from history (out of scope)

### Pipeline Orchestrator (internal component)

- **Can do:** Record execution metrics at stage boundaries; write to history file
- **Cannot do:** Alter past entries; delete selective entries

---

## 4. Behaviour Overview

### Happy-path behaviour

1. User invokes `/implement-feature "slug"` and pipeline executes normally
2. At each stage transition (Alex, Cass, Nigel, Codey-plan, Codey-implement), timestamps are recorded
3. On pipeline completion (success or failure), a history entry is written to `.claude/pipeline-history.json`
4. User runs `murmur8 history` to view recent executions and statistics

### Key alternatives or branches

- **Pipeline paused:** If `--pause-after` is used, history entry is recorded up to the pause point with status `paused`
- **Pipeline failure:** If a stage fails, history entry records failure stage and status `failed`
- **No history file:** On first write, file is created with empty array structure
- **History clear:** User runs `murmur8 history clear` to remove all entries

### User-visible outcomes

- List of recent pipeline runs with timing and status
- Success rate percentage across all runs
- Average duration per stage
- Most common failure stage (if any failures exist)

---

## 5. State & Lifecycle Interactions

### States entered

- **history_recording:** When pipeline starts, a pending history entry is created in memory
- **history_persisted:** When pipeline completes/fails/pauses, entry is written to file

### States modified

- Queue state (`.claude/implement-queue.json`) is extended with `startedAt` timestamp for each stage (if not already present)

### This feature is:

- **State-creating:** Creates new history entries per pipeline run
- **Not state-transitioning:** Does not alter pipeline flow
- **Not state-constraining:** Does not block pipeline operations

---

## 6. Rules & Decision Logic

### Rule: History Entry Creation

- **Description:** A history entry is created when a pipeline run completes (success), fails, or pauses
- **Inputs:** Feature slug, stage timestamps, final status
- **Outputs:** JSON object appended to history array
- **Deterministic:** Yes

### Rule: Duration Calculation

- **Description:** Duration per stage calculated as difference between stage start and next stage start (or completion time for final stage)
- **Inputs:** Stage timestamps
- **Outputs:** Duration in milliseconds for each stage
- **Deterministic:** Yes

### Rule: Statistics Aggregation

- **Description:** Statistics computed on-read from full history file
- **Inputs:** All history entries
- **Outputs:** Success rate, average durations, failure frequency by stage
- **Deterministic:** Yes

### Rule: Display Limit Default

- **Description:** By default, show last 10 runs; `--all` shows unlimited
- **Inputs:** Flag presence, history array length
- **Outputs:** Truncated or full list
- **Deterministic:** Yes

---

## 7. Dependencies

### System components

- `src/orchestrator.js` — Must emit events or expose hooks for recording stage transitions
- `bin/cli.js` — Must register new `history` command
- `.claude/implement-queue.json` — May be read for timing data during pipeline execution

### External systems

- None

### Operational dependencies

- File system access to `.claude/` directory
- Permissions to write `.claude/pipeline-history.json`

---

## 8. Non-Functional Considerations

### Performance sensitivity

- History file read/write should be efficient; consider file size growth over time
- ASSUMPTION: Most users will have <100 runs; O(n) aggregation is acceptable

### Audit/logging needs

- History file serves as an audit log of pipeline executions
- Timestamps must be ISO 8601 format for consistency

### Error tolerance

- If history file is corrupted or unreadable, CLI should warn and allow continuation (no blocking)
- History recording failure should not abort pipeline execution

### Security implications

- Feature slugs may contain project information; history file should be gitignored
- No sensitive data (credentials, secrets) should appear in history entries

---

## 9. Assumptions & Open Questions

### Assumptions

- ASSUMPTION: History file will grow at a manageable rate (tens to hundreds of entries)
- ASSUMPTION: Stage names are stable (alex, cass, nigel, codey-plan, codey-implement)
- ASSUMPTION: ISO 8601 timestamps are sufficient for duration calculations

### Open Questions

- Should history entries include partial stage data for paused pipelines?
- Should `--stats` include median duration alongside average?
- Should there be a `history export` subcommand for CI integration (deferred)?

---

## 10. Impact on System Specification

### Alignment assessment

This feature **reinforces existing system assumptions**:

- Per SYSTEM_SPEC.md:Section 8 (Observability), the system already tracks queue status and completion summaries
- This feature extends observability to historical analysis without changing core behaviour
- The queue file structure (`.claude/implement-queue.json`) already captures timestamps; this feature adds persistence beyond current run

### No contradictions identified

The feature does not alter:

- Agent roles or boundaries
- Pipeline flow or stage order
- Artifact structures or handoff mechanisms

### Minor extension to system spec

The following addition to SYSTEM_SPEC.md:Section 5 (Core Domain Concepts) may be warranted:

> **History Entry** — A record of a completed pipeline run, including slug, timestamps per stage, duration, and final status. Persisted to `.claude/pipeline-history.json`.

This is flagged as a **non-breaking extension** for consideration.

---

## 11. Handover to BA (Cass)

### Story themes

1. **History recording** — Capturing execution data during pipeline runs
2. **History display** — CLI command for viewing recent runs
3. **Statistics display** — Aggregate metrics via `--stats` flag
4. **History management** — Clearing history via `history clear`

### Expected story boundaries

- Recording logic should be a separate story from display logic
- Statistics computation may be combined with display or separated
- Clear functionality is a distinct, small story

### Areas needing careful story framing

- The interaction between `--pause-after` and history recording needs precise acceptance criteria
- Error handling when history file is corrupted should be explicit
- The "most common failure stage" calculation needs clear definition when there are ties

---

## 12. Change Log (Feature-Level)

| Date       | Change                                | Reason                       | Raised By |
|------------|---------------------------------------|------------------------------|-----------|
| 2026-02-24 | Initial feature specification created | Feature request from user    | Alex      |
