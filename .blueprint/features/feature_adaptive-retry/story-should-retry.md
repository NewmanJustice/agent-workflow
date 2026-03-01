# Story — Should Retry Decision Logic

## User Story

As a **developer using murmur8**, I want the **pipeline to intelligently decide whether to recommend retrying** so that **I receive useful guidance based on attempt count, failure history, and system state**.

---

## Context / Scope

- Per FEATURE_SPEC.md:Section 4 (Happy Path), retry module is consulted when an agent fails
- Per FEATURE_SPEC.md:Section 5 (State & Lifecycle), this operates within the transition from any agent state to FAILED
- Per FEATURE_SPEC.md:Section 8 (Resilience), graceful degradation is required when history/config is corrupted
- Per SYSTEM_SPEC.md:Section 8 (Failure Handling), each agent spawn currently offers retry, skip, abort

---

## Acceptance Criteria

**AC-1 — Consult retry module on agent failure**
- Given an agent fails during pipeline execution,
- When the error handling flow is triggered,
- Then the retry module is consulted before displaying options to the user,
- And the module returns a recommendation (strategy name or "abort-recommended").

**AC-2 — Record retry attempts in history**
- Given the user chooses to retry (with or without strategy),
- When the retry completes (success or failure),
- Then the outcome is recorded in `.claude/pipeline-history.json`,
- And the record includes: `retryAttempts` count and `strategiesUsed[]` array.

**AC-3 — Track attempt count per stage per feature**
- Given an agent fails and user retries,
- When tracking retry state,
- Then the attempt count is incremented for the current stage and feature combination,
- And the count persists across retries within the same pipeline run.

**AC-4 — Degrade gracefully with corrupted history**
- Given the history file at `.claude/pipeline-history.json` is corrupted or missing,
- When the retry module is consulted,
- Then the module defaults to simple retry recommendation,
- And a warning is logged: "History file unavailable; defaulting to simple retry".

**AC-5 — Degrade gracefully with corrupted configuration**
- Given the configuration file at `.claude/retry-config.json` is corrupted or missing,
- When the retry module calculates strategy,
- Then hardcoded defaults are used for thresholds and strategies,
- And a warning is logged: "Config file unavailable; using default settings".

**AC-6 — Preserve state transitions**
- Given a retry is in progress,
- When the retry attempt completes successfully,
- Then the pipeline continues to the next stage as normal,
- And the state transitions per SYSTEM_SPEC.md:Section 6 (e.g., CASS to NIGEL).

**AC-7 — Support abort without retry**
- Given the user is shown retry options,
- When the user selects "abort",
- Then the feature is moved to the failed list in the queue,
- And no retry is attempted,
- And the failure is recorded with reason "user-aborted".

---

## Integration Points

Per FEATURE_SPEC.md:Section 7 (Dependencies):

- **src/history.js:** `readHistoryFile()` provides failure data
- **src/insights.js:** `analyzeFailures()` calculates failure rates by stage
- **src/orchestrator.js:** Queue management receives retry module functions
- **SKILL.md:** Error handling section references retry recommendations

---

## History Record Schema

Per FEATURE_SPEC.md:Section 8 (Audit/Logging), new fields in history entries:

```json
{
  "featureSlug": "adaptive-retry",
  "stage": "cass",
  "outcome": "success",
  "timestamp": "2026-02-24T10:30:00Z",
  "retryAttempts": 2,
  "strategiesUsed": ["retry", "reduce-stories"]
}
```

---

## Out of Scope

- Automatic retry without user prompt (user always has final say)
- Retry across different features (each feature's retry state is independent)
- Persistent retry state across pipeline invocations (state is per-run only; history is persistent)
- Batch retry of multiple failed features (single-feature focus per SYSTEM_SPEC.md:Section 10)
