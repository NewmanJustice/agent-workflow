# Implementation Plan — Compressed Feedback Prompts

## Summary

Compress verbose feedback prompts (~10 lines) to terse format (~3 lines) across three pipeline stages (Cass, Nigel, Codey). Update `src/feedback.js` to normalize the abbreviated "rec" key to "recommendation" and add a parsing function for extracting feedback JSON from agent output.

## Files to Create/Modify

| Path | Action | Purpose |
|------|--------|---------|
| `SKILL.md` | Modify | Compress feedback prompts in Steps 6.5, 7.5, 8.5 |
| `src/feedback.js` | Modify | Add key normalization and output parsing functions |

## Implementation Steps

1. **Add `normalizeFeedbackKeys()` to feedback.js** — Function that converts `{rec: "..."}` to `{recommendation: "..."}` while preserving existing full key.

2. **Add `parseFeedbackFromOutput()` to feedback.js** — Regex-based parser to extract `FEEDBACK: {...}` JSON from agent output text.

3. **Update `validateFeedback()` in feedback.js** — Accept both "rec" and "recommendation" keys by checking either before validation.

4. **Export new functions from feedback.js** — Add `normalizeFeedbackKeys` and `parseFeedbackFromOutput` to module.exports.

5. **Compress Step 6.5 prompt in SKILL.md** — Replace Cass→Alex verbose prompt with:
   ```
   FEEDBACK FIRST: Rate Alex's spec 1-5, list issues (e.g., unclear-scope), recommend proceed|pause|revise.
   Format: FEEDBACK: {"rating":N,"issues":["..."],"rec":"proceed|pause|revise"}
   Then continue with your task.
   ```

6. **Compress Step 7.5 prompt in SKILL.md** — Replace Nigel→Cass verbose prompt with similar terse format.

7. **Compress Step 8.5 prompt in SKILL.md** — Replace Codey→Nigel verbose prompt with similar terse format.

8. **Run tests** — Execute `node --test test/feature_compressed-feedback.test.js` to verify implementation.

## Risks/Questions

- **Agent interpretation:** Terse prompts may occasionally confuse agents; monitor initial runs for correct feedback format.
- **Key preference:** If both "rec" and "recommendation" appear, current implementation prefers "recommendation" — this matches test expectations.
