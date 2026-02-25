# Test Specification — Compressed Feedback Prompts

## Feature Understanding

This feature compresses verbose feedback prompts (~10 lines, ~200 tokens) into terse prompts (~3 lines, ~70 tokens) while maintaining identical output format and quality gate functionality. Three feedback collection points are affected: Cass→Alex, Nigel→Cass, Codey→Nigel.

## Derived Acceptance Criteria

| AC-ID | Acceptance Criteria |
|-------|---------------------|
| AC-01 | Compressed prompt format: single-line instruction with inline example |
| AC-02 | JSON output format: `{"rating":N,"issues":[...],"rec":"..."}` |
| AC-03 | Key normalization: "rec" maps to "recommendation" |
| AC-04 | Rating must be integer 1-5 |
| AC-05 | Issues must be array of strings |
| AC-06 | Recommendation values: "proceed", "pause", or "revise" |
| AC-07 | Token savings: compressed format significantly shorter than verbose |

## AC → Test ID Mapping

| AC-ID | Test ID | Test Description |
|-------|---------|------------------|
| AC-01 | T01 | Compressed prompt matches expected terse format |
| AC-02 | T02 | Feedback JSON output parses correctly |
| AC-03 | T03 | Key "rec" normalizes to "recommendation" |
| AC-04 | T04 | Rating validates as integer 1-5 |
| AC-05 | T05 | Issues validates as string array |
| AC-06 | T06 | Recommendation validates against allowed values |
| AC-07 | T07 | Compressed prompt has fewer characters/lines than verbose |

## Test Coverage Notes

- **Unit tests**: JSON parsing, key normalization, validation
- **Format tests**: Prompt structure verification
- **Edge cases**: Empty issues array, boundary ratings (1 and 5)
