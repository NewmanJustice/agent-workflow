# Story — Failure Pattern Analysis

## User story

As a developer, I want to analyze which pipeline stages fail most frequently so that I can identify systemic issues and improve pipeline reliability.

---

## Context / scope

- User has executed multiple pipeline runs, some of which have failed
- History data includes entries with `status: "failed"` and associated stage information
- This is a read-only analysis; no pipeline state is modified
- Route: `murmur8 insights` or `murmur8 insights --failures`

Per FEATURE_SPEC.md:Section 6 (Rule: Failure Pattern Analysis):
- Failure rate threshold: >15% is reported as concerning
- Recommendation threshold: >20% triggers specific recommendation

---

## Acceptance criteria

**AC-1 — Display failure rates per stage**
- Given the history file contains at least 3 pipeline runs with at least one failure,
- When the user runs `murmur8 insights`,
- Then the output includes a "Failure Patterns" section showing failure rate for each stage that has experienced failures.

**AC-2 — Identify most common failure stage**
- Given failures exist in the history,
- When the analysis completes,
- Then the output identifies the stage with the highest failure count as the "most common failure stage".

**AC-3 — Flag concerning failure rates**
- Given a stage has a failure rate greater than 15%,
- When the analysis completes,
- Then that stage is flagged as having a concerning failure rate.

**AC-4 — Generate recommendation for high failure rate**
- Given a stage has a failure rate greater than 20%,
- When the analysis completes,
- Then the output includes the recommendation: "Review {stage} agent configuration or specification clarity".

**AC-5 — Identify features with repeated failures**
- Given the same feature slug has failed multiple times,
- When the analysis completes,
- Then those features are listed as correlation hints (e.g., "Feature 'complex-auth' has failed 3 times").

**AC-6 — Filter to failures only**
- Given the user runs `murmur8 insights --failures`,
- When the analysis completes,
- Then only the failure pattern analysis section is displayed (other analysis types are omitted).

**AC-7 — No failures recorded**
- Given all pipeline runs in history have status "completed" (no failures),
- When the user runs `murmur8 insights`,
- Then the failure analysis section displays: "No failures recorded" and is omitted from recommendations.

---

## Out of scope

- Automatic correlation with feature complexity metrics
- Root cause analysis beyond stage identification
- Failure notification or alerting
- Retry or remediation automation
- Classification of failure types (timeout vs error vs abort)

---

## References

- Feature spec: `.blueprint/features/feature_pipeline-insights/FEATURE_SPEC.md`
- Upstream dependency: `.blueprint/features/feature_pipeline-history/FEATURE_SPEC.md`
- System spec: `.blueprint/system_specification/SYSTEM_SPEC.md`
