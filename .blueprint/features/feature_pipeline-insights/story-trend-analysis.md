# Story — Trend Analysis

## User story

As a developer, I want to track whether pipeline performance is improving or degrading over time so that I can understand the impact of changes and maintain development efficiency.

---

## Context / scope

- User has accumulated sufficient history to compare earlier vs later runs
- Analysis compares first half vs second half of history data
- Requires minimum 6 runs to compute meaningful trends
- This is a read-only analysis; no pipeline state is modified
- Route: `orchestr8 insights` (trends section included by default)

Per FEATURE_SPEC.md:Section 6 (Rule: Trend Analysis):
- Improving: >10% better in second half
- Degrading: >10% worse in second half
- Stable: within 10% variance
- Minimum data: 6 runs required

---

## Acceptance criteria

**AC-1 — Display success rate trend**
- Given the history file contains at least 6 pipeline runs,
- When the user runs `orchestr8 insights`,
- Then the output includes a "Trends" section showing success rate trend as "improving", "stable", or "degrading".

**AC-2 — Display duration trend**
- Given the history file contains at least 6 pipeline runs,
- When the user runs `orchestr8 insights`,
- Then the output includes average duration trend as "improving" (faster), "stable", or "degrading" (slower).

**AC-3 — Calculate trend by comparing halves**
- Given the history contains N runs (where N >= 6),
- When trend analysis is performed,
- Then the first N/2 runs are compared against the last N/2 runs to determine trend direction.

**AC-4 — Apply threshold for trend classification**
- Given the percentage change between halves is calculated,
- When classifying the trend,
- Then >10% improvement shows "improving", >10% degradation shows "degrading", and within 10% shows "stable".

**AC-5 — Generate recommendation for degrading trend**
- Given either success rate or duration trend is "degrading",
- When the analysis completes,
- Then the output includes the recommendation: "Review recent changes to agent specifications or system spec".

**AC-6 — Insufficient data for trends**
- Given the history file contains fewer than 6 runs,
- When trend analysis is attempted,
- Then it is skipped with explanation: "Insufficient data for trend analysis. Need at least 6 runs."

**AC-7 — Show percentage change**
- Given trend analysis completes successfully,
- When the output is displayed,
- Then the percentage change for both success rate and duration is shown alongside the trend indicator.

---

## Out of scope

- Sliding window trend analysis (uses fixed first-half/second-half)
- Time-based trend analysis (e.g., last 30 days)
- Per-stage trend analysis
- Trend visualization or charting
- Predictive modelling of future performance

---

## References

- Feature spec: `.blueprint/features/feature_pipeline-insights/FEATURE_SPEC.md`
- Upstream dependency: `.blueprint/features/feature_pipeline-history/FEATURE_SPEC.md`
- System spec: `.blueprint/system_specification/SYSTEM_SPEC.md`
