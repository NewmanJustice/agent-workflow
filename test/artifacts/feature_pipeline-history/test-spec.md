# Test Specification - Pipeline History

## Understanding

The pipeline history feature provides observability into murmur8 pipeline executions. It records execution metrics (timestamps, durations, status) during pipeline runs to `.claude/pipeline-history.json`, and provides CLI commands to display history (`murmur8 history`), view statistics (`--stats`), and clear data (`history clear`). Per FEATURE_SPEC.md:Section 5, this creates new state without altering pipeline flow. Recording failures must not abort the pipeline.

Key behaviors: automatic recording at stage boundaries, JSON persistence, tabular display with color-coded status, aggregate statistics computation, and confirmation-protected clear functionality.

---

## AC to Test ID Mapping

### Story: Record Pipeline Execution (story-record-execution.md)

| AC | Test ID | Scenario |
|----|---------|----------|
| AC-1 | T-RE-1.1 | History entry appended on success with status "success" |
| AC-2 | T-RE-2.1 | History entry appended on failure with status "failed" |
| AC-2 | T-RE-2.2 | Failed stage recorded in failedStage field |
| AC-3 | T-RE-3.1 | History entry appended on pause with status "paused" |
| AC-3 | T-RE-3.2 | Only stages up to pause point have timestamps |
| AC-4 | T-RE-4.1 | Each stage has startedAt timestamp in ISO 8601 |
| AC-4 | T-RE-4.2 | Each stage has completedAt timestamp in ISO 8601 |
| AC-4 | T-RE-4.3 | Each stage has durationMs calculated |
| AC-5 | T-RE-5.1 | History file created if absent |
| AC-5 | T-RE-5.2 | New file contains array with single entry |
| AC-6 | T-RE-6.1 | Warning logged on write failure |
| AC-6 | T-RE-6.2 | Pipeline not aborted on recording failure |

### Story: Display Pipeline History (story-display-history.md)

| AC | Test ID | Scenario |
|----|---------|----------|
| AC-1 | T-DH-1.1 | Shows last 10 runs by default |
| AC-1 | T-DH-1.2 | Display includes slug, status, date, duration |
| AC-2 | T-DH-2.1 | --all flag shows all entries |
| AC-3 | T-DH-3.1 | Empty/missing file shows "No pipeline history found." |
| AC-4 | T-DH-4.1 | Corrupted file shows warning message |
| AC-4 | T-DH-4.2 | Command exits with code 0 on corrupted file |
| AC-5 | T-DH-5.1 | Success entries formatted green |
| AC-5 | T-DH-5.2 | Failed entries formatted red |
| AC-5 | T-DH-5.3 | Paused entries formatted yellow |
| AC-6 | T-DH-6.1 | Entries ordered by completedAt descending |

### Story: Show Pipeline Statistics (story-show-statistics.md)

| AC | Test ID | Scenario |
|----|---------|----------|
| AC-1 | T-SS-1.1 | Success rate displayed as percentage |
| AC-1 | T-SS-1.2 | Success rate includes run counts (e.g., "17/20 runs") |
| AC-2 | T-SS-2.1 | Average duration shown per stage |
| AC-3 | T-SS-3.1 | Total average duration for successful runs |
| AC-4 | T-SS-4.1 | Most common failure stage displayed |
| AC-5 | T-SS-5.1 | Tied failure stages all listed |
| AC-6 | T-SS-6.1 | "No failures recorded" shown when no failures |
| AC-7 | T-SS-7.1 | Insufficient data message for empty history |

### Story: Clear Pipeline History (story-clear-history.md)

| AC | Test ID | Scenario |
|----|---------|----------|
| AC-1 | T-CH-1.1 | Confirmation prompt shown with entry count |
| AC-1 | T-CH-1.2 | Only 'y' or 'yes' confirms |
| AC-2 | T-CH-2.1 | File reset to empty array on confirm |
| AC-2 | T-CH-2.2 | Success message shows entries removed count |
| AC-3 | T-CH-3.1 | Decline leaves file unchanged |
| AC-3 | T-CH-3.2 | Cancelled message shown on decline |
| AC-4 | T-CH-4.1 | --force skips confirmation |
| AC-5 | T-CH-5.1 | "No history to clear" for empty/missing file |
| AC-5 | T-CH-5.2 | Exit code 0 for empty history |

---

## Key Assumptions

- History module at `src/history.js` exporting `recordHistory()`, `displayHistory()`, `showStats()`, `clearHistory()`
- History command added to CLI routing in `bin/cli.js`
- Stage names: alex, cass, nigel, codey-plan, codey-implement (per FEATURE_SPEC.md:Section 9)
- ISO 8601 timestamps use `new Date().toISOString()`
- Duration calculated as `completedAt - startedAt` in milliseconds
- Confirmation input via readline or similar; tests will mock stdin
- Color output detection via terminal capability checks
