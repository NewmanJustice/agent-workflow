# Implementation Plan: Smart Story Routing

## Summary

This feature adds automatic classification of features as "technical" or "user-facing" to determine whether the Cass (story writing) stage should be included in the pipeline. Implementation requires creating a new classifier module and integrating it with the orchestrator and SKILL.md pipeline definition.

## Files to Create/Modify

| Path | Action | Purpose |
|------|--------|---------|
| `src/classifier.js` | Create | Classification logic, flag parsing, decision function |
| `src/orchestrator.js` | Modify | Add `featureType` and `skippedCass` to queue state |
| `src/index.js` | Modify | Export classifier module |
| `SKILL.md` | Modify | Add routing logic and new flags documentation |
| `bin/cli.js` | Modify | Add `classify` command for testing/debugging |

## Implementation Steps

1. **Create `src/classifier.js` with keyword lists**
   - Define `TECHNICAL_KEYWORDS` array (refactor, token, performance, etc.)
   - Define `USER_FACING_KEYWORDS` array (user, customer, UI, etc.)
   - Define `TECHNICAL_PATTERNS` and `USER_FACING_PATTERNS` regex arrays
   - Tests: T-CF-1.1, T-CF-1.2, T-CF-1.3, T-CF-2.1, T-CF-2.2, T-CF-2.3

2. **Implement `classifyFeature(specContent)` function**
   - Case-insensitive keyword counting
   - Pattern matching for regex patterns
   - Return `{ type, technicalCount, userFacingCount, reason }`
   - Tie-breaking: user-facing wins (conservative default)
   - Tests: T-CF-3.1, T-CF-3.2

3. **Implement `parseStoryFlags(args)` function**
   - Parse `--with-stories` flag -> `{ override: 'include' }`
   - Parse `--skip-stories` flag -> `{ override: 'skip' }`
   - No flag -> `{ override: null }`
   - Tests: T-FP-1.1, T-FP-1.2, T-FP-1.3, T-FP-1.4

4. **Implement `shouldIncludeStories(featureType, override)` function**
   - Override takes precedence over classification
   - Return boolean for pipeline routing decision
   - Tests: T-SD-1.1, T-SD-1.2, T-SD-2.1, T-SD-2.2

5. **Implement logging helper `logClassification(result)`**
   - Console output: "Feature classified as {type}: {reason}"
   - Include indicator counts for transparency

6. **Update `src/orchestrator.js` setCurrent function**
   - Add optional `featureType` and `skippedCass` fields to queue state
   - Ensure fields persist through queue operations
   - Tests: T-QS-1.1, T-QS-1.2, T-QS-1.3

7. **Update `src/index.js` exports**
   - Export classifier functions for use by SKILL.md

8. **Update `SKILL.md` pipeline routing**
   - Add classification step after Step 5 (Initialize)
   - Document `--with-stories` and `--skip-stories` flags
   - Add conditional routing: if technical, skip to Nigel

9. **Add optional CLI command `classify`**
   - Usage: `npx orchestr8 classify path/to/FEATURE_SPEC.md`
   - Outputs classification result for debugging/testing

10. **Run all tests and verify**
    - `node --test test/feature_smart-story-routing.test.js`
    - Ensure all 19 tests pass

## Risks/Questions

- **Keyword list completeness**: May need tuning based on real-world usage; current lists from spec are a starting point
- **Pattern matching performance**: Regex patterns should be compiled once, not per-call
- **Edge case handling**: Empty/whitespace-only specs default to user-facing (safe default)
- **SKILL.md integration**: Routing logic is instructional, not code - relies on Claude following instructions correctly
