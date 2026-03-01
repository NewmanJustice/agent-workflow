# Story — Show Pipeline Statistics

## User story

As a developer using murmur8, I want to see aggregate statistics about pipeline performance so that I can identify bottlenecks and improvement opportunities.

---

## Context / scope

- New CLI flag: `murmur8 history --stats`
- Computes statistics from all entries in `.claude/pipeline-history.json`
- Per FEATURE_SPEC.md:Section 6 (Rule: Statistics Aggregation), statistics are computed on-read
- Per FEATURE_SPEC.md:Section 4 (User-visible outcomes): success rate, avg duration, common failure stage

---

## Acceptance criteria

**AC-1 — Display success rate**
- Given history contains both successful and failed runs,
- When I run `murmur8 history --stats`,
- Then I see the success rate as a percentage (e.g., "Success rate: 85% (17/20 runs)").

**AC-2 — Display average duration per stage**
- Given history contains completed runs,
- When I run `murmur8 history --stats`,
- Then I see average duration for each stage (alex, cass, nigel, codey-plan, codey-implement).

**AC-3 — Display total average duration**
- Given history contains completed runs,
- When I run `murmur8 history --stats`,
- Then I see the average total pipeline duration across all successful runs.

**AC-4 — Display most common failure stage**
- Given history contains failed runs,
- When I run `murmur8 history --stats`,
- Then I see the stage that has failed most frequently (e.g., "Most common failure: nigel (3 failures)").

**AC-5 — Handle ties in failure stage**
- Given multiple stages have equal failure counts,
- When I run `murmur8 history --stats`,
- Then all tied stages are listed (e.g., "Most common failures: cass, nigel (2 each)").

**AC-6 — No failures message**
- Given history contains only successful runs,
- When I run `murmur8 history --stats`,
- Then I see "No failures recorded" instead of failure stage data.

**AC-7 — Insufficient data message**
- Given history is empty or has no completed runs,
- When I run `murmur8 history --stats`,
- Then I see "Insufficient data for statistics. Complete at least one pipeline run."

---

## CLI output format

```
Pipeline Statistics (based on 25 runs)

  METRIC                    VALUE
  Success rate              85% (17/20 completed runs)
  Total runs                25 (17 success, 5 failed, 3 paused)
  Avg pipeline duration     12m 45s

  STAGE           AVG DURATION    FAILURES
  alex            2m 30s          0
  cass            1m 45s          1
  nigel           3m 00s          3
  codey-plan      1m 15s          0
  codey-implement 4m 15s          1

  Most common failure: nigel (3 failures)
```

---

## Out of scope

- Median duration (per FEATURE_SPEC.md:Section 9 open question)
- Percentile calculations (p50, p90, p99)
- Time-range filtering for statistics
- Graphical visualisations
- Export to external formats
