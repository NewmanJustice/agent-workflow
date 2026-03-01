# Feature Specification — Adaptive Retry

## 1. Feature Intent
**Why this feature exists.**

The murmur8 pipeline currently offers simple retry/skip/abort options when an agent fails (per SKILL.md:Error Handling). This feature introduces **intelligent retry logic** that learns from failure history to make smarter decisions about how to handle failures.

- **Problem being addressed:** Pipeline failures are handled uniformly regardless of context. Repeated failures at the same stage waste time with identical retry attempts.
- **User need:** Developers want the pipeline to adapt its retry approach based on what has historically worked, reducing manual intervention and improving success rates.
- **System alignment:** Per SYSTEM_SPEC.md:Section 6 (High-Level Lifecycle), recovery from failure is already supported. This feature enhances that capability by making recovery **adaptive** rather than static.

---

## 2. Scope
### In Scope
- Retry configuration file management (`.claude/retry-config.json`)
- Failure pattern detection using existing history module (`src/history.js`)
- Strategy selection logic based on failure rates and attempt counts
- CLI commands for viewing and managing retry configuration
- Integration with pipeline error handling (advisory, not replacing user choice)

### Out of Scope
- Automatic prompt rewriting (strategies describe *what* to do; agents execute)
- Modifications to agent specifications or core pipeline orchestration
- Machine learning or model-based prediction (rule-based only)
- Cross-feature failure correlation (each feature is handled independently)

---

## 3. Actors Involved

### Human User
- Can view current retry configuration via CLI
- Can modify thresholds and enabled strategies
- Can reset configuration to defaults
- Retains final decision authority on retry/skip/abort during pipeline execution

### Pipeline Orchestrator (SKILL.md implementation)
- Queries retry module when an agent fails
- Receives recommended strategy and displays it to user
- Applies strategy modifications to agent prompts when user accepts retry

### History Module (src/history.js)
- Provides failure data for strategy calculation
- Is read-only from this feature's perspective

### Insights Module (src/insights.js)
- Provides `analyzeFailures()` which calculates failure rates by stage
- Is read-only from this feature's perspective

---

## 4. Behaviour Overview

### Happy Path: Strategy-Guided Retry
1. Agent fails during pipeline execution
2. Retry module queries history for recent failures at this stage
3. Module calculates failure rate over recent window (default: last 10 runs)
4. If failure rate > threshold (20%), recommend alternative strategy; otherwise recommend simple retry
5. Display recommendation to user: "Recommended strategy: {strategy}. Retry with this approach? (y/n/abort)"
6. If user accepts, modify agent prompt per strategy and retry
7. Record outcome in history

### Alternative: First Failure
- If this is the first recorded failure for a stage (no history), default to simple retry
- No prompt modification; standard retry behaviour

### Alternative: Max Retries Exceeded
- After `maxRetries` (default 3) attempts at same stage for same feature, warn user
- User can still choose to retry, but recommendation becomes "abort or skip"

### Alternative: User Declines Strategy
- User can override recommendation and choose different action (retry/skip/abort)
- System respects user choice; recommendation is advisory only

---

## 5. State & Lifecycle Interactions

### States Affected
Per SYSTEM_SPEC.md:Section 6, pipeline states are: INIT, ALEX, CASS, NIGEL, CODEY_PLAN, CODEY_IMPLEMENT, COMMIT, COMPLETE, PAUSED, RESUME.

This feature operates within the **transition from any agent state to FAILED**:
- On agent error, before prompting user, retry module is consulted
- State remains in current stage during retry attempts
- State transitions to FAILED only on abort (unchanged from current behaviour)

### Lifecycle Classification
- **State-constraining:** Does not create new states; constrains how transitions to FAILED are handled
- **Queue-modifying:** May update `failed` array with additional metadata (strategy attempted, attempt count)

---

## 6. Rules & Decision Logic

### Rule 1: Calculate Stage Failure Rate
- **Description:** Determine how often a specific stage has failed in recent history
- **Inputs:** Stage name, history entries, window size (default 10)
- **Outputs:** Failure rate (0.0 to 1.0)
- **Type:** Deterministic

```
failureRate = failedRunsAtStage / totalRecentRuns
```

### Rule 2: Select Retry Strategy
- **Description:** Choose appropriate strategy based on failure rate and attempt count
- **Inputs:** Stage name, current attempt number, failure rate, configured strategies
- **Outputs:** Recommended strategy name
- **Type:** Deterministic with precedence

```
if (attemptCount > maxRetries) → "abort-recommended"
if (failureRate > highFailureThreshold) → alternativeStrategy[stage][attemptCount]
else → "retry"
```

### Rule 3: Apply Strategy to Prompt
- **Description:** Modify agent prompt based on selected strategy
- **Inputs:** Original prompt, strategy name, stage context
- **Outputs:** Modified prompt (or original if strategy is "retry")
- **Type:** Deterministic

Strategy applications:
| Strategy | Prompt Modification |
|----------|-------------------|
| `retry` | No modification |
| `simplify-prompt` | Add: "Focus on core requirements only. Skip edge cases and optional sections." |
| `reduce-stories` | Add: "Write only the 2-3 most critical user stories. Defer others to follow-up." |
| `simplify-tests` | Add: "Write only happy-path tests for each AC. Skip edge cases." |
| `add-context` | Prepend relevant sections from previous stage outputs |
| `incremental` | Add: "Implement one test at a time. Stop and report after each." |
| `rollback` | Execute `git checkout -- .` on implementation files before retry |

### Rule 4: Persist Configuration
- **Description:** Configuration survives across sessions
- **Inputs:** User modifications via CLI
- **Outputs:** Updated `.claude/retry-config.json`
- **Type:** Deterministic (file write)

---

## 7. Dependencies

### System Components
- **src/history.js:** `readHistoryFile()` for failure data access (read-only dependency)
- **src/insights.js:** `analyzeFailures()` for failure pattern analysis (read-only dependency)
- **src/orchestrator.js:** Queue management; retry module will export functions for orchestrator to call
- **SKILL.md:** Error handling section will reference retry module recommendations

### File Dependencies
- **`.claude/pipeline-history.json`:** Must exist with valid structure for accurate analysis
- **`.claude/retry-config.json`:** Created on first use if not present; gitignored

### Operational Dependencies
- History module must be functional (feature degrades gracefully if corrupted)
- File system write access for configuration persistence

---

## 8. Non-Functional Considerations

### Performance
- Strategy calculation should complete in <100ms (simple arithmetic on in-memory data)
- No blocking I/O during recommendation phase beyond initial history read

### Resilience
- If history file is corrupted, default to simple retry (no strategy recommendation)
- If config file is corrupted or missing, use hardcoded defaults
- All failures in retry module should be caught and logged, not propagated

### Audit/Logging
- Retry attempts and strategies used should be recorded in history entries
- New history fields: `retryAttempts`, `strategiesUsed[]`

### Maintainability
- Strategies should be configurable without code changes
- New strategies can be added by updating config schema and `applyStrategy()` function

---

## 9. Assumptions & Open Questions

### Assumptions
- ASSUMPTION: History file format is stable and matches `src/history.js` expectations
- ASSUMPTION: Pipeline execution is single-threaded; no concurrent retry decisions needed
- ASSUMPTION: User preference is final; recommendations are advisory only
- ASSUMPTION: Stage names match exactly between history, insights, and retry module

### Open Questions
- Should strategy history be factored into recommendations? (e.g., "simplify-prompt worked last time")
- Should there be a "never retry" option for specific stages?
- How should retry configuration interact with `--pause-after` flags?

---

## 10. Impact on System Specification

### Reinforces Existing Assumptions
- Per SYSTEM_SPEC.md:Section 8 (Cross-Cutting Concerns), failure handling already "offers retry, skip, abort"
- This feature enhances rather than replaces that pattern
- Per SYSTEM_SPEC.md:Section 7 (Governing Rules), "recovery-safe" queue behaviour is maintained

### Stretches Existing Assumptions
- History module was designed for reporting/insights; now becomes an active input to pipeline decisions
- This elevates history from "observability" to "operational dependency"

### No Contradictions Identified
- Feature operates within existing error handling flow
- Does not modify agent specifications or pipeline sequence
- Preserves user authority over final decisions

---

## 11. Handover to BA (Cass)

### Story Themes
1. **Configuration Management:** User can view, modify, and reset retry configuration
2. **Strategy Recommendation:** Pipeline recommends retry strategy based on failure history
3. **Prompt Modification:** Retry strategies modify agent prompts to improve success probability
4. **History Integration:** Retry decisions are informed by historical failure patterns

### Expected Story Boundaries
- CLI commands (`retry-config`, `retry-config reset`) as separate story
- Strategy selection logic as separate story
- Strategy application (prompt modification) as separate story
- Graceful degradation (corrupted history/config) as non-functional story or AC within above

### Areas Needing Careful Framing
- User choice must remain paramount; stories should emphasize "recommendation" not "automation"
- The "rollback" strategy involves destructive action (`git checkout`); needs explicit user confirmation
- Incremental strategy changes Codey's execution model; may need coordination with Codey's agent spec

---

## 12. Change Log (Feature-Level)
| Date | Change | Reason | Raised By |
|------|--------|--------|-----------|
| 2026-02-24 | Initial feature specification | New feature request | Alex |
