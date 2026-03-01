# Story — Strategy Recommendation

## User Story

As a **developer using murmur8**, I want the **pipeline to recommend a retry strategy based on failure history** so that **I can make informed decisions about how to handle failures more effectively**.

---

## Context / Scope

- Per FEATURE_SPEC.md:Section 4 (Behaviour Overview), recommendations are advisory only; user retains final choice
- Per FEATURE_SPEC.md:Section 6 (Rule 1 & Rule 2), strategy selection is based on failure rate calculation
- Per FEATURE_SPEC.md:Section 3 (Actors), the History Module provides failure data (read-only)
- Per FEATURE_SPEC.md:Section 7 (Dependencies), uses `src/history.js` and `src/insights.js`

---

## Acceptance Criteria

**AC-1 — Calculate failure rate from history**
- Given an agent fails during pipeline execution,
- When the retry module is consulted,
- Then the failure rate is calculated as `failedRunsAtStage / totalRecentRuns` over the configured window (default 10 runs),
- And the calculation uses data from `.claude/pipeline-history.json`.

**AC-2 — Recommend simple retry for low failure rate**
- Given the calculated failure rate is at or below the threshold (default 20%),
- When displaying retry options to the user,
- Then the recommendation is "retry" with no prompt modification suggested,
- And the message format is: "Recommended: Simple retry. Retry? (y/n/skip/abort)".

**AC-3 — Recommend alternative strategy for high failure rate**
- Given the calculated failure rate exceeds the threshold (default 20%),
- When displaying retry options to the user,
- Then an alternative strategy from the stage's strategy list is recommended,
- And the message format is: "Recommended strategy: {strategyName}. Retry with this approach? (y/apply/skip/abort)".

**AC-4 — Escalate strategy on subsequent attempts**
- Given a retry attempt has already been made at the current stage,
- When another failure occurs and the user is prompted again,
- Then the next strategy in the stage's strategy list is recommended,
- And if all strategies have been exhausted, "abort-recommended" is suggested.

**AC-5 — Default to simple retry with no history**
- Given this is the first recorded run or no history exists for the current stage,
- When an agent fails,
- Then the recommendation is "retry" (simple retry),
- And a note indicates "No failure history for this stage; defaulting to simple retry".

**AC-6 — Warn when max retries exceeded**
- Given the current attempt count exceeds `maxRetries` (default 3) for the same feature and stage,
- When displaying options to the user,
- Then the recommendation is "abort-recommended" or "skip-recommended",
- And a warning is displayed: "Max retries ({count}) exceeded for {stage}. Consider skipping or aborting."

**AC-7 — Display recommendation without forcing choice**
- Given a strategy recommendation is displayed,
- When the user selects a different option (e.g., chooses "skip" when "retry" was recommended),
- Then the user's choice is respected,
- And no error or warning is shown for overriding the recommendation.

---

## Session State

During pipeline execution, retry state is tracked:

```js
retryState = {
  stage: 'cass',
  featureSlug: 'adaptive-retry',
  attemptCount: 2,
  strategiesUsed: ['retry', 'reduce-stories'],
  failureRate: 0.3
}
```

---

## Out of Scope

- Machine learning or predictive models for strategy selection (per FEATURE_SPEC.md:Section 2)
- Cross-feature failure correlation (per FEATURE_SPEC.md:Section 2)
- Automatic retry without user confirmation (user choice is paramount)
- Modifying the agent prompts (that is story-prompt-modification)
