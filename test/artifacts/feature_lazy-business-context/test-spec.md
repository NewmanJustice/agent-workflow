# Test Specification — Lazy Business Context Loading

## Understanding

This feature implements lazy loading of business context files to reduce token usage. Instead of always loading `.business_context/*` for every agent, the pipeline detects whether the feature spec cites business context and only includes it when referenced. Alex always has access (as the feature spec creator), and an `--include-business-context` override flag provides an escape hatch.

---

## Derived Acceptance Criteria

Since no user stories were provided, ACs are derived from the feature spec rules (Section 6) and behavior overview (Section 4).

### Detection Logic (DL)

| AC ID | Acceptance Criteria |
|-------|---------------------|
| DL-1 | Detection scans feature spec content for `.business_context` substring |
| DL-2 | Detection scans feature spec content for `business_context/` substring |
| DL-3 | Either pattern match returns `needsBusinessContext: true` |
| DL-4 | No match returns `needsBusinessContext: false` (default exclude) |

### Conditional Inclusion (CI)

| AC ID | Acceptance Criteria |
|-------|---------------------|
| CI-1 | When `needsBusinessContext: true`, agent prompt includes business context directive |
| CI-2 | When `needsBusinessContext: false`, agent prompt omits business context directive |
| CI-3 | Detection result stored in queue as `current.needsBusinessContext` |

### Override Flag (OF)

| AC ID | Acceptance Criteria |
|-------|---------------------|
| OF-1 | `--include-business-context` flag is recognized by pipeline |
| OF-2 | Flag overrides detection to force `needsBusinessContext: true` |
| OF-3 | Flag works regardless of feature spec content |

### Alex Exception (AE)

| AC ID | Acceptance Criteria |
|-------|---------------------|
| AE-1 | Alex stage always has business context access |
| AE-2 | Alex exception applies regardless of detection result |
| AE-3 | Alex exception applies regardless of override flag |

---

## AC to Test ID Mapping

### Detection Logic

| AC | Test ID | Scenario |
|----|---------|----------|
| DL-1 | T-DL-1 | Detects `.business_context` in feature spec content |
| DL-2 | T-DL-2 | Detects `business_context/` in feature spec content |
| DL-3 | T-DL-3 | Returns true when either pattern matches |
| DL-4 | T-DL-4 | Returns false when no pattern matches |
| DL-4 | T-DL-5 | Partial matches that aren't valid references return false |

### Conditional Inclusion

| AC | Test ID | Scenario |
|----|---------|----------|
| CI-1 | T-CI-1 | True flag produces prompt with business context directive |
| CI-2 | T-CI-2 | False flag produces prompt without business context directive |
| CI-3 | T-CI-3 | Queue structure includes `needsBusinessContext` field |

### Override Flag

| AC | Test ID | Scenario |
|----|---------|----------|
| OF-1 | T-OF-1 | Flag is parsed from command arguments |
| OF-2 | T-OF-2 | Flag overrides detection to true |
| OF-3 | T-OF-3 | Flag works when feature spec has no citations |

### Alex Exception

| AC | Test ID | Scenario |
|----|---------|----------|
| AE-1 | T-AE-1 | Alex prompt always includes business context |
| AE-2 | T-AE-2 | Alex gets context even when detection is false |
| AE-3 | T-AE-3 | Alex gets context regardless of override flag state |

---

## Key Assumptions

- Detection function is a pure function accepting feature spec content string
- Detection uses simple string matching as specified in Section 4
- Queue file is JSON with `current` object containing `needsBusinessContext` boolean
- Override flag follows existing CLI flag pattern (`--flag-name`)
- Alex exception is implemented in prompt generation, not detection logic
- Business context directive pattern: `/business_context/` or similar path reference
