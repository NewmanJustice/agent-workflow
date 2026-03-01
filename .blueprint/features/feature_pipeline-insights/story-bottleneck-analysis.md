# Story — Bottleneck Analysis

## User story

As a developer, I want to identify which pipeline stage consistently takes the longest so that I can focus optimization efforts where they will have the greatest impact.

---

## Context / scope

- User has executed multiple pipeline runs via `/implement-feature`
- History data exists in `.claude/pipeline-history.json`
- This is a read-only analysis; no pipeline state is modified
- Route: `murmur8 insights` or `murmur8 insights --bottlenecks`

Per FEATURE_SPEC.md:Section 6 (Rule: Bottleneck Detection):
- Bottleneck threshold: >35% of total pipeline time
- Recommendation threshold: >40% of total pipeline time

---

## Acceptance criteria

**AC-1 — Display bottleneck stage**
- Given the history file contains at least 3 successful pipeline runs,
- When the user runs `murmur8 insights`,
- Then the output includes a "Bottlenecks" section identifying the stage with the highest average duration.

**AC-2 — Show percentage of total time**
- Given a bottleneck stage is identified,
- When the analysis completes,
- Then the output displays the stage name, average duration in milliseconds, and percentage of total pipeline time.

**AC-3 — Bottleneck threshold reporting**
- Given a stage accounts for more than 35% of total pipeline time,
- When the analysis completes,
- Then that stage is flagged as a bottleneck in the output.

**AC-4 — Generate recommendation for severe bottleneck**
- Given a stage accounts for more than 40% of total pipeline time,
- When the analysis completes,
- Then the output includes the recommendation: "Consider simplifying {stage} requirements or splitting features".

**AC-5 — Filter to bottlenecks only**
- Given the user runs `murmur8 insights --bottlenecks`,
- When the analysis completes,
- Then only the bottleneck analysis section is displayed (other analysis types are omitted).

**AC-6 — Insufficient data handling**
- Given the history file contains fewer than 3 runs,
- When the user runs `murmur8 insights`,
- Then the output displays: "Insufficient data for insights. Complete at least 3 pipeline runs."

**AC-7 — Missing history file handling**
- Given no history file exists at `.claude/pipeline-history.json`,
- When the user runs `murmur8 insights`,
- Then the output displays: "No history found. Run some pipelines first."

---

## Out of scope

- Modifying the history file or pipeline configuration
- Customizing the 35%/40% threshold values
- Providing automated remediation
- Stage-specific threshold configuration
- Analysis of partial/in-progress runs

---

## References

- Feature spec: `.blueprint/features/feature_pipeline-insights/FEATURE_SPEC.md`
- Upstream dependency: `.blueprint/features/feature_pipeline-history/FEATURE_SPEC.md`
- System spec: `.blueprint/system_specification/SYSTEM_SPEC.md`
