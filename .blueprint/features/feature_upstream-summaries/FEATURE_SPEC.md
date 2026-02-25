# Feature Specification — Upstream Summaries

## 1. Feature Intent
**Why this feature exists.**

- Currently, downstream agents read full upstream artifacts (feature specs, stories, test specs)
- Codey reads: feature spec + all stories + test spec + plan = potentially 1,000+ lines
- Much of this content is not needed for the downstream task
- Structured handoff summaries reduce input tokens by 30-50% for later stages

---

## 2. Scope
### In Scope
- Each agent produces a structured "Handoff Summary" at end of output
- Downstream agents read summary + their direct inputs only
- Summary format standardized across all agents

### Out of Scope
- Changing what agents produce (full artifacts still created)
- Removing ability to read full upstream files if needed
- Automated summary generation (agents write summaries manually)

---

## 3. Actors Involved

| Actor | Produces Summary For | Reads Summary From |
|-------|---------------------|-------------------|
| Alex | Cass | N/A (first in chain) |
| Cass | Nigel | Alex |
| Nigel | Codey | Cass |
| Codey | N/A (last in chain) | Nigel |

---

## 4. Behaviour Overview

**Happy path:**
1. Alex creates feature spec + writes handoff summary
2. Cass reads Alex's summary (not full spec), writes stories + handoff summary
3. Nigel reads Cass's summary + stories, writes tests + handoff summary
4. Codey reads Nigel's summary + tests + plan, implements

**Handoff summary format:**
```markdown
## Handoff Summary
**For:** {Next Agent}
**Feature:** {slug}

### Key Decisions
- {Decision 1}
- {Decision 2}
- {Decision 3}

### Files Created
- {path/to/file1.md}
- {path/to/file2.md}

### Open Questions
- {Question if any, or "None"}

### Critical Context
{1-2 sentences of must-know information}
```

**Key outcomes:**
- ~2,000-4,000 fewer tokens for Nigel and Codey stages
- Faster downstream processing
- Clearer handoffs between agents

---

## 5. State & Lifecycle Interactions

- Summaries are written to the feature directory
- New file per stage: `{FEAT_DIR}/handoff-{agent}.md`
- Pipeline reads summary file paths from queue

---

## 6. Rules & Decision Logic

| Rule | Description |
|------|-------------|
| Summary required | Every agent (except Codey-implement) must produce a handoff summary |
| Max length | Summaries must be <30 lines |
| No duplication | Don't repeat content that's in the main artifact |
| Actionable | Focus on what downstream agent needs to know |

---

## 7. Dependencies

- SKILL.md prompts updated to require summaries
- SKILL.md prompts updated to read summaries instead of full upstream files
- Queue may need to track summary file paths

---

## 8. Non-Functional Considerations

- **Performance:** 30-50% reduction in downstream agent input tokens
- **Clarity:** Explicit handoffs improve traceability
- **Overhead:** Small increase in upstream agent output (~30 lines)

---

## 9. Assumptions & Open Questions

**Assumptions:**
- Agents can write useful summaries
- Summaries capture enough context for downstream success
- Full files remain available if summary is insufficient

**Open Questions:**
- Should summaries be separate files or appended to main artifacts?
- What happens if an agent needs info not in the summary?
- Should the pipeline validate summary quality?

---

## 10. Impact on System Specification

- Reinforces principle of explicit handoffs between agents
- Adds new artifact type (handoff summaries) to pipeline
- No contradiction with system spec

---

## 11. Handover to BA (Cass)

**Story themes:**
- Define handoff summary format
- Update Alex to produce summary
- Update Cass to read summary + produce summary
- Update Nigel to read summary + produce summary
- Update Codey to read summary
- Update SKILL.md with new prompt structure

**Expected story boundaries:**
- One story for summary format definition
- One story per agent update

---

## 12. Change Log (Feature-Level)
| Date | Change | Reason | Raised By |
|-----|------|--------|-----------|
| 2026-02-25 | Initial spec | Token efficiency improvement | Claude |
