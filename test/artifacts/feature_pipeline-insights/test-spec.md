# Test Specification — Pipeline Insights

## Understanding

This feature adds a read-only analysis layer on top of pipeline-history data. It provides:
- Bottleneck detection (stages consuming >35% of pipeline time)
- Failure pattern analysis (stages with >15% failure rate)
- Anomaly detection (durations exceeding mean + 2*stddev)
- Trend analysis (first-half vs second-half comparison)
- JSON output for programmatic consumption

Analysis requires minimum 3 runs (6 for trends). All thresholds are fixed.

---

## AC to Test ID Mapping

### Story: Bottleneck Analysis
| AC | Test ID | Scenario |
|----|---------|----------|
| AC-1 | T-B1.1 | Display bottleneck stage with 3+ runs |
| AC-2 | T-B1.2 | Show stage name, duration ms, percentage |
| AC-3 | T-B1.3 | Flag stage >35% as bottleneck |
| AC-4 | T-B1.4 | Generate recommendation when >40% |
| AC-5 | T-B1.5 | --bottlenecks filter shows only bottleneck section |
| AC-6 | T-B1.6 | <3 runs shows insufficient data message |
| AC-7 | T-B1.7 | Missing history file shows no history message |

### Story: Failure Patterns
| AC | Test ID | Scenario |
|----|---------|----------|
| AC-1 | T-F1.1 | Display failure rate per stage |
| AC-2 | T-F1.2 | Identify most common failure stage |
| AC-3 | T-F1.3 | Flag stage >15% failure rate as concerning |
| AC-4 | T-F1.4 | Generate recommendation when >20% |
| AC-5 | T-F1.5 | List features with repeated failures |
| AC-6 | T-F1.6 | --failures filter shows only failure section |
| AC-7 | T-F1.7 | No failures shows "No failures recorded" |

### Story: Anomaly Detection
| AC | Test ID | Scenario |
|----|---------|----------|
| AC-1 | T-A1.1 | Detect duration > mean + 2*stddev |
| AC-2 | T-A1.2 | Show slug, stage, actual, expected, deviation |
| AC-3 | T-A1.3 | Only evaluate last 10 runs |
| AC-4 | T-A1.4 | Generate recommendation when anomalies found |
| AC-5 | T-A1.5 | No anomalies shows appropriate message |
| AC-6 | T-A1.6 | <3 runs shows insufficient data message |

### Story: Trend Analysis
| AC | Test ID | Scenario |
|----|---------|----------|
| AC-1 | T-T1.1 | Display success rate trend |
| AC-2 | T-T1.2 | Display duration trend |
| AC-3 | T-T1.3 | Compare first half vs second half |
| AC-4 | T-T1.4 | >10% change classified correctly |
| AC-5 | T-T1.5 | Generate recommendation when degrading |
| AC-6 | T-T1.6 | <6 runs shows insufficient data message |
| AC-7 | T-T1.7 | Show percentage change in output |

### Story: JSON Output
| AC | Test ID | Scenario |
|----|---------|----------|
| AC-1 | T-J1.1 | --json produces valid JSON |
| AC-2 | T-J1.2 | JSON contains bottlenecks object |
| AC-3 | T-J1.3 | JSON contains failures object |
| AC-4 | T-J1.4 | JSON contains anomalies object |
| AC-5 | T-J1.5 | JSON contains trends object |
| AC-6 | T-J1.6 | --json --bottlenecks shows only bottlenecks |
| AC-7 | T-J1.7 | Insufficient data returns error field |

---

## Key Assumptions

- ASSUMPTION: History schema is `{ slug, status, stages: [{name, durationMs}], totalDurationMs }`
- ASSUMPTION: Stage names are: `alex`, `cass`, `nigel`, `codey-plan`, `codey-implement`
- ASSUMPTION: Tests mock history data rather than creating real pipeline runs
- ASSUMPTION: Standard deviation calculated using population formula
- ASSUMPTION: Ties in "most common failure stage" resolved by first occurrence
- ASSUMPTION: All runs sorted chronologically by completedAt timestamp
