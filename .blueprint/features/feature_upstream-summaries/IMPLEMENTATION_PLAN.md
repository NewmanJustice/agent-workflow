# Implementation Plan: Upstream Summaries

## Summary

Add structured "Handoff Summary" artifacts to the agent pipeline. Each agent (Alex, Cass, Nigel) will produce a `handoff-{agent}.md` file containing key decisions, files created, open questions, and critical context. SKILL.md prompts will be updated to instruct agents to write summaries and read upstream summaries instead of full artifacts.

---

## Files to Create/Modify

| Path | Action | Purpose |
|------|--------|---------|
| `SKILL.md` | Modify | Update Alex/Cass/Nigel prompts to require handoff summary output |
| `SKILL.md` | Modify | Update Cass/Nigel/Codey prompts to read upstream handoff summary |
| `SKILL.md` | Modify | Add `{HANDOFF_*}` path variables to Paths table |
| `src/handoff.js` | Create | Helper functions to parse/validate handoff summary format |

---

## Implementation Steps

1. **Add handoff path variables to SKILL.md**
   - Add `{HANDOFF_ALEX}`, `{HANDOFF_CASS}`, `{HANDOFF_NIGEL}` to Paths table
   - Pattern: `{FEAT_DIR}/handoff-{agent}.md`
   - Tests: T-3.4, T-4.2

2. **Create src/handoff.js helper module**
   - Export `parseHandoffSummary(content)` function matching test implementation
   - Export `validateHandoffSummary(content)` for line count and format checks
   - Export `extractSection(content, sectionName)` for parsing sections
   - Tests: T-1.1 through T-1.7, T-2.1 through T-2.3

3. **Update Alex prompt in SKILL.md (Step 6)**
   - Add output: write `{FEAT_DIR}/handoff-alex.md`
   - Add summary format template to prompt
   - Specify: `**For:** Cass`, feature slug, key decisions, files created
   - Tests: T-3.1

4. **Update Cass prompt in SKILL.md (Step 7)**
   - Add input: read `{FEAT_DIR}/handoff-alex.md` instead of full feature spec
   - Add output: write `{FEAT_DIR}/handoff-cass.md`
   - Specify: `**For:** Nigel`
   - Tests: T-3.2

5. **Update Nigel prompt in SKILL.md (Step 8)**
   - Add input: read `{FEAT_DIR}/handoff-cass.md` instead of full stories
   - Add output: write `{FEAT_DIR}/handoff-nigel.md`
   - Specify: `**For:** Codey`
   - Tests: T-3.3

6. **Update Codey prompts in SKILL.md (Steps 9, 10)**
   - Add input: read `{FEAT_DIR}/handoff-nigel.md` instead of full test spec
   - No output summary (last in chain)
   - Tests: T-4.1

7. **Update queue structure for handoff paths (optional)**
   - Add `upstreamSummary` field to queue entries if needed for recovery
   - Tests: T-4.1

8. **Run tests and verify**
   - Execute `node --test test/feature_upstream-summaries.test.js`
   - All 15 tests should pass

---

## Risks/Questions

- **Backward compatibility**: Existing features without handoff files may break if prompts strictly require them. Mitigation: Add "if exists" fallback in prompts.
- **Token savings**: Actual savings depend on how well agents write concise summaries. May need guidance on brevity.
- **Full file access**: Spec says full files remain available. Consider adding "For additional context, see: {path}" to summaries.
