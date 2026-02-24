# Implementation Plan — Pipeline Insights

## Summary

This feature adds a new `orchestr8 insights` CLI command that performs read-only analysis of pipeline history data. It computes bottleneck detection, failure patterns, anomaly detection, and trend analysis, outputting human-readable recommendations or JSON. The implementation creates a new `src/insights.js` module that reuses `readHistoryFile()` from the existing `src/history.js`.

---

## Files to Create/Modify

| Path | Action | Purpose |
|------|--------|---------|
| `src/insights.js` | Create | Core analysis engine with all computation logic |
| `bin/cli.js` | Modify | Register `insights` command and route flags |

---

## Implementation Steps

1. **Create `src/insights.js` scaffold** - Export main `displayInsights(options)` function that reads history via `readHistoryFile()` and validates minimum data (3 runs).

2. **Implement bottleneck analysis** - Calculate average duration per stage across successful runs; identify stage with highest mean; compute percentage of total; flag if >35%; generate recommendation if >40%.

3. **Implement failure pattern analysis** - Count failures by stage; compute failure rate per stage; identify most common failure stage; list features with repeated failures; flag if rate >15%; generate recommendation if >20%.

4. **Implement anomaly detection** - Calculate mean and stddev per stage from all runs; evaluate last 10 runs; flag any stage duration exceeding mean + 2*stddev; include slug, stage, actual, expected, deviation in output.

5. **Implement trend analysis** - Require 6+ runs; split history into first and second halves; compare success rates and average durations; classify as improving/stable/degrading based on 10% threshold; show percentage change.

6. **Implement output formatters** - Create `formatTextOutput(analysis)` for human-readable output and `formatJsonOutput(analysis)` for structured JSON; handle section filtering based on flags.

7. **Handle edge cases** - Missing history file returns "No history found"; corrupted file shows warning; insufficient data (<3 runs) shows appropriate message; no failures omits failure section with "No failures recorded".

8. **Register CLI command** - In `bin/cli.js`, import `displayInsights` from `src/insights.js`; add `insights` command with flag parsing for `--bottlenecks`, `--failures`, `--json`.

9. **Run tests and verify** - Execute `node --test test/feature_pipeline-insights.test.js` after each file change; ensure all tests pass.

10. **Final cleanup** - Verify output formatting matches AC requirements; ensure recommendations use exact wording from spec.

---

## Key Functions

**In `src/insights.js`:**
- `displayInsights(options)` - Main entry point; orchestrates analysis and output
- `analyzeBottlenecks(history)` - Returns `{ stage, avgDurationMs, percentage, isBottleneck, recommendation }`
- `analyzeFailures(history)` - Returns `{ failuresByStage, mostCommonStage, repeatedFeatures, recommendation }`
- `detectAnomalies(history)` - Returns `{ anomalies: [{slug, stage, actual, expected, deviation}], recommendation }`
- `analyzeTrends(history)` - Returns `{ successRate: {trend, change}, duration: {trend, change}, recommendation }`
- `formatTextOutput(analysis, sections)` - Formats analysis as human-readable text
- `formatJsonOutput(analysis, sections)` - Formats analysis as JSON object
- `calculateMean(values)` - Helper: compute arithmetic mean
- `calculateStdDev(values, mean)` - Helper: compute population standard deviation

**In `bin/cli.js`:**
- Extend `parseFlags()` to recognize `--bottlenecks`, `--failures`, `--json`
- Add `insights` command entry in `commands` object

---

## Risks/Questions

- **History schema assumption**: Implementation assumes `stages` is an object with `{name: {durationMs}}` structure per test-spec.md. If actual schema differs, adapter logic may be needed.
- **Tie-breaking**: Per test-spec.md, ties in "most common failure stage" resolved by first occurrence. Implementation should use stable sort or maintain insertion order.
- **Standard deviation formula**: Using population stddev (N divisor) per test-spec.md assumption, not sample stddev (N-1).
