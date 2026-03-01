# Story — Feedback Insights

## User Story

As a **developer**, I want **correlation analysis between feedback scores and pipeline outcomes** so that **I can understand how predictive agent feedback is and tune thresholds accordingly**.

---

## Context / Scope

- Per FEATURE_SPEC.md:Section 7, extends `src/insights.js` with feedback analysis functions
- Per FEATURE_SPEC.md:Section 6 (Rule 4), calculates agent calibration as correlation between ratings and outcomes
- Depends on feedback being stored in history (story-feedback-collection.md)
- Per FEATURE_SPEC.md:Section 9, requires 10+ completed runs for meaningful results

---

## Acceptance Criteria

**AC-1 — Feedback analysis command**
- Given the user runs `murmur8 insights --feedback`,
- When sufficient history exists (10+ completed runs with feedback),
- Then a feedback analysis report is displayed.

**AC-2 — Agent calibration scoring**
- Given the feedback analysis runs,
- When calibration is calculated per agent,
- Then each agent receives a calibration score (0.0-1.0):
  - 0.0 = feedback uncorrelated with outcomes
  - 1.0 = perfect predictor of success/failure
- And the score is displayed as "Cass calibration: 0.72" format.

**AC-3 — Issue pattern correlation**
- Given feedback history contains issue codes,
- When the analysis runs,
- Then issue codes are correlated with failure outcomes,
- And frequently predictive issues are highlighted (e.g., "`unclear-scope` preceded 80% of failures").

**AC-4 — Threshold recommendation**
- Given sufficient calibration data exists,
- When the analysis runs,
- Then a recommended `minRatingThreshold` is suggested based on historical data,
- And the recommendation balances false positives (unnecessary pauses) and false negatives (missed quality issues).

**AC-5 — Insufficient data handling**
- Given the user runs `murmur8 insights --feedback`,
- When fewer than 10 completed runs with feedback exist,
- Then a message is displayed: "Insufficient data for feedback analysis. {N}/10 runs with feedback available."

**AC-6 — Retry strategy mapping**
- Given feedback analysis identifies predictive issue patterns,
- When the user views insights,
- Then issue-to-strategy mappings are displayed (per FEATURE_SPEC.md:Rule 3),
- And the user can see which retry strategies are recommended for common issues.

---

## Out of Scope

- Cross-pipeline feedback aggregation (each project is independent)
- Real-time calibration updates during pipeline execution
- Natural language interpretation of feedback patterns
- Automatic threshold adjustment (user must run `feedback-config set`)
