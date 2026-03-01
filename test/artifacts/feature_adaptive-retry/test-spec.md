# Test Specification — Adaptive Retry

## Understanding

The adaptive-retry feature adds intelligent retry logic to the murmur8 pipeline. When an agent fails, the retry module calculates failure rates from history and recommends strategies to improve retry success. Key components:
- **Retry configuration** (`retry-config.json`): thresholds, max retries, strategies per stage
- **Strategy recommendation**: based on failure rate vs threshold, escalates through strategy list
- **Prompt modification**: strategies modify agent prompts (e.g., simplify, add context, rollback)
- **Should-retry logic**: consults module on failure, tracks attempts, degrades gracefully

## AC to Test ID Mapping

### Story: Retry Configuration (story-retry-config.md)

| AC | Test ID | Scenario |
|----|---------|----------|
| AC-1 | T-RC-1 | View config when file exists |
| AC-2 | T-RC-2 | View defaults when no file |
| AC-3 | T-RC-3 | Modify config value |
| AC-5 | T-RC-4 | Reset config to defaults |
| AC-6 | T-RC-5 | Create file on first modification |
| AC-7 | T-RC-6 | Handle corrupted config |

### Story: Strategy Recommendation (story-strategy-recommendation.md)

| AC | Test ID | Scenario |
|----|---------|----------|
| AC-1 | T-SR-1 | Calculate failure rate from history |
| AC-2 | T-SR-2 | Recommend simple retry for low failure rate |
| AC-3 | T-SR-3 | Recommend alternative strategy for high failure rate |
| AC-4 | T-SR-4 | Escalate strategy on subsequent attempts |
| AC-6 | T-SR-5 | Warn when max retries exceeded |

### Story: Prompt Modification (story-prompt-modification.md)

| AC | Test ID | Scenario |
|----|---------|----------|
| AC-1 | T-PM-1 | Apply simplify-prompt strategy |
| AC-7 | T-PM-2 | No modification for retry strategy |
| AC-6 | T-PM-3 | Rollback strategy returns git command |

### Story: Should Retry (story-should-retry.md)

| AC | Test ID | Scenario |
|----|---------|----------|
| AC-1 | T-SH-1 | Consult retry module returns recommendation |
| AC-4 | T-SH-2 | Degrade gracefully with corrupted history |
| AC-5 | T-SH-3 | Degrade gracefully with missing config |

## Assumptions

- ASSUMPTION: Retry module will be implemented in `src/retry.js`
- ASSUMPTION: Config file path is `.claude/retry-config.json` relative to project root
- ASSUMPTION: History file path is `.claude/pipeline-history.json` relative to project root
- ASSUMPTION: Default failure threshold is 0.2 (20%), max retries is 3, window size is 10
- ASSUMPTION: Strategy lists per stage match FEATURE_SPEC.md:Section 6 schema
- ASSUMPTION: `applyStrategy()` returns modified prompt string or original for "retry"
- ASSUMPTION: `calculateFailureRate()` returns a number between 0 and 1
- ASSUMPTION: `recommendStrategy()` returns strategy name string

## Test Strategy

- Use temp directories for file isolation
- Mock history data via file creation
- Focus on core logic: config CRUD, rate calculation, strategy selection, prompt modification
- Skip UI/CLI output formatting tests (integration scope)

## Traceability

| Story | ACs Covered | Test Count |
|-------|-------------|------------|
| retry-config | AC-1,2,3,5,6,7 | 6 |
| strategy-recommendation | AC-1,2,3,4,6 | 5 |
| prompt-modification | AC-1,6,7 | 3 |
| should-retry | AC-1,4,5 | 3 |
| **Total** | **17 ACs** | **17 tests** |
