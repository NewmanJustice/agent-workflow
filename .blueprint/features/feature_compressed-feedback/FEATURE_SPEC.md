# Feature Specification — Compressed Feedback Prompts

## 1. Feature Intent
**Why this feature exists.**

- Current feedback prompts are verbose (~10 lines, ~200 tokens per stage)
- Feedback is collected at 3 points: Cass→Alex, Nigel→Cass, Codey→Nigel
- Total overhead: ~600 tokens per pipeline run
- Compressed prompts achieve same result with ~3 lines each

---

## 2. Scope
### In Scope
- Rewrite feedback prompt sections to be more concise
- Maintain same output format (JSON with rating, issues, recommendation)
- Ensure feedback quality is not degraded

### Out of Scope
- Changing feedback data structure
- Removing feedback collection
- Changing quality gate thresholds

---

## 3. Actors Involved

| Actor | Feedback Role |
|-------|--------------|
| Cass | Rates Alex's feature spec |
| Nigel | Rates Cass's user stories |
| Codey | Rates Nigel's tests |

---

## 4. Behaviour Overview

**Current verbose prompt (~10 lines):**
```
FIRST, before writing stories, evaluate Alex's feature spec:
- Rating (1-5): How clear and complete is the spec?
- Issues: List any problems (e.g., "missing-error-handling", "unclear-scope")
- Recommendation: "proceed" | "pause" | "revise"

Output your feedback as:
FEEDBACK: { "rating": N, "issues": [...], "recommendation": "..." }
```

**Compressed prompt (~3 lines):**
```
FEEDBACK FIRST: Rate prior stage 1-5, list issues (e.g., unclear-scope), recommend proceed|pause|revise.
Format: FEEDBACK: {"rating":N,"issues":["..."],"rec":"proceed|pause|revise"}
Then continue with your task.
```

**Key outcomes:**
- ~400 fewer tokens per pipeline run (3 stages × ~130 token savings)
- Same feedback data collected
- Same quality gate functionality

---

## 5. State & Lifecycle Interactions

- No state changes
- Feedback format unchanged
- Quality gate logic unchanged

---

## 6. Rules & Decision Logic

| Rule | Description |
|------|-------------|
| Same output format | JSON structure must remain compatible with feedback.js |
| Abbreviations allowed | "rec" instead of "recommendation" in output |
| Examples condensed | One inline example instead of multiple lines |

---

## 7. Dependencies

- SKILL.md feedback sections updated
- `src/feedback.js` may need to accept abbreviated keys ("rec" → "recommendation")
- No other module changes

---

## 8. Non-Functional Considerations

- **Performance:** ~400 token reduction per run
- **Clarity:** Compressed prompts must still be unambiguous
- **Risk:** Agents may misinterpret terse instructions

---

## 9. Assumptions & Open Questions

**Assumptions:**
- Agents can parse terse instructions correctly
- Abbreviated JSON keys are acceptable
- Feedback quality won't degrade with shorter prompts

**Open Questions:**
- Should we A/B test compressed vs verbose prompts?
- Is "rec" acceptable or should we keep "recommendation"?
- Do we need to update feedback.js to normalize keys?

---

## 10. Impact on System Specification

- No impact on system specification
- Feedback behaviour unchanged
- Quality gates unchanged

---

## 11. Handover to BA (Cass)

**Story themes:**
- Rewrite Cass feedback prompt (rates Alex)
- Rewrite Nigel feedback prompt (rates Cass)
- Rewrite Codey feedback prompt (rates Nigel)
- Update feedback.js if key normalization needed

**Expected story boundaries:**
- One story for prompt compression (all 3 stages)
- One story for feedback.js updates if needed

---

## 12. Change Log (Feature-Level)
| Date | Change | Reason | Raised By |
|-----|------|--------|-----------|
| 2026-02-25 | Initial spec | Token efficiency improvement | Claude |
