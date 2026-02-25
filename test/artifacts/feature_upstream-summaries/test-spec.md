# Test Specification — Upstream Summaries

## Understanding

This feature introduces structured "Handoff Summaries" that agents produce at the end of their output. Each agent (except Codey-implement) writes a summary file (`handoff-{agent}.md`) that downstream agents read instead of full upstream artifacts. Goal: 30-50% reduction in downstream input tokens. Summaries follow a standard format with Key Decisions, Files Created, Open Questions, and Critical Context sections. Max 30 lines per summary.

---

## Derived Acceptance Criteria

From Feature Spec sections 2, 4, 5, 6:

| ID | Derived AC | Source |
|----|-----------|--------|
| DAC-1 | Each agent (Alex, Cass, Nigel) produces a handoff summary | Section 2, 6 |
| DAC-2 | Summaries follow standardized markdown format | Section 4 |
| DAC-3 | Summary has required sections: For, Feature, Key Decisions, Files Created, Open Questions, Critical Context | Section 4 |
| DAC-4 | Summaries written to feature directory as `handoff-{agent}.md` | Section 5 |
| DAC-5 | Summaries must be <30 lines | Section 6 |
| DAC-6 | Downstream agents read summary from upstream agent | Section 4 |
| DAC-7 | Summaries must not duplicate main artifact content | Section 6 |
| DAC-8 | Summaries must be actionable for downstream agent | Section 6 |

---

## AC to Test ID Mapping

### Handoff Summary Format

| AC | Test ID | Scenario |
|----|---------|----------|
| DAC-2 | T-1.1 | Summary starts with `## Handoff Summary` heading |
| DAC-3 | T-1.2 | Summary has `**For:**` field with agent name |
| DAC-3 | T-1.3 | Summary has `**Feature:**` field with slug |
| DAC-3 | T-1.4 | Summary has `### Key Decisions` section |
| DAC-3 | T-1.5 | Summary has `### Files Created` section with paths |
| DAC-3 | T-1.6 | Summary has `### Open Questions` section |
| DAC-3 | T-1.7 | Summary has `### Critical Context` section |

### Summary Rules & Constraints

| AC | Test ID | Scenario |
|----|---------|----------|
| DAC-5 | T-2.1 | Summary is under 30 lines |
| DAC-7 | T-2.2 | Key Decisions contains 1-5 bullet items |
| DAC-8 | T-2.3 | Files Created contains valid file paths |

### Agent-Specific Summaries

| AC | Test ID | Scenario |
|----|---------|----------|
| DAC-1 | T-3.1 | Alex summary targets Cass as recipient |
| DAC-1 | T-3.2 | Cass summary targets Nigel as recipient |
| DAC-1 | T-3.3 | Nigel summary targets Codey as recipient |
| DAC-4 | T-3.4 | Summary files named `handoff-alex.md`, `handoff-cass.md`, `handoff-nigel.md` |

### Downstream Reading

| AC | Test ID | Scenario |
|----|---------|----------|
| DAC-6 | T-4.1 | Pipeline config allows reading upstream summary file path |
| DAC-6 | T-4.2 | Summary file path follows pattern `{FEAT_DIR}/handoff-{agent}.md` |

---

## Key Assumptions

- Summaries are separate files, not appended to main artifacts
- Line count includes all lines (blank and non-blank)
- Agent names in "For" field are capitalized: Cass, Nigel, Codey
- File paths in "Files Created" use forward slashes
- "None" is valid for Open Questions section
- Codey-implement stage does not produce a summary (last in chain)
