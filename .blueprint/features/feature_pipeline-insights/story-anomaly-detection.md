# Story — Anomaly Detection

## User story

As a developer, I want to identify pipeline runs where stage durations deviated significantly from normal so that I can investigate unusual behaviour and understand outliers.

---

## Context / scope

- User has accumulated enough history data to establish baseline metrics
- Analysis uses statistical deviation (mean + 2*stddev) to identify anomalies
- Scope limited to last 10 runs to keep output manageable
- This is a read-only analysis; no pipeline state is modified
- Route: `orchestr8 insights` (anomaly section included by default)

Per FEATURE_SPEC.md:Section 6 (Rule: Anomaly Detection):
- Threshold: 2 standard deviations above mean
- Scope: Last 10 runs only

---

## Acceptance criteria

**AC-1 — Detect anomalous stage durations**
- Given the history file contains at least 3 pipeline runs,
- When the user runs `orchestr8 insights`,
- Then the output includes an "Anomalies" section listing any runs where a stage duration exceeded mean + 2*stddev.

**AC-2 — Display anomaly details**
- Given an anomalous run is detected,
- When the analysis completes,
- Then the output shows: feature slug, stage name, actual duration, expected duration (mean), and deviation factor.

**AC-3 — Limit scope to recent runs**
- Given the history contains more than 10 runs,
- When anomaly detection is performed,
- Then only the most recent 10 runs are evaluated for anomalies.

**AC-4 — Generate recommendation when anomalies found**
- Given one or more anomalous runs are detected,
- When the analysis completes,
- Then the output includes the recommendation: "Investigate flagged runs for unusual feature complexity".

**AC-5 — No anomalies detected**
- Given all recent runs have stage durations within 2 standard deviations of the mean,
- When the user runs `orchestr8 insights`,
- Then the anomalies section displays: "No anomalies detected in recent runs."

**AC-6 — Insufficient data for statistics**
- Given the history file contains fewer than 3 runs,
- When anomaly detection is attempted,
- Then it is skipped with explanation: "Insufficient data for anomaly detection."

---

## Out of scope

- Configurable standard deviation threshold
- Stage-specific anomaly thresholds
- Anomaly detection for failure counts (only duration-based)
- Historical anomaly tracking beyond last 10 runs
- Automatic investigation or drill-down into anomalous runs

---

## References

- Feature spec: `.blueprint/features/feature_pipeline-insights/FEATURE_SPEC.md`
- Upstream dependency: `.blueprint/features/feature_pipeline-history/FEATURE_SPEC.md`
- System spec: `.blueprint/system_specification/SYSTEM_SPEC.md`
