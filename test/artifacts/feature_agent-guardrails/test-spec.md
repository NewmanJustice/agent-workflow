# Test Specification — Agent Guardrails

## Understanding

This feature adds guardrail text to the 4 agent specification files (AGENT_*.md). Tests verify that each agent spec contains required guardrail sections covering: source restrictions, citation requirements, confidentiality constraints, and escalation protocols. Tests read agent .md files and check for presence of required section headers and key phrases.

Per FEATURE_SPEC.md: guardrails are behavioural constraints (documentation), not runtime checks.

---

## AC to Test ID Mapping

### Story: Source Restrictions

| AC | Test ID | Scenario |
|----|---------|----------|
| AC-1 | T-SR-1.1 | Agent specs list allowed sources |
| AC-2 | T-SR-2.1 | Agent specs list prohibited sources |
| AC-3 | T-SR-3.1 | Agent specs prohibit training data for domain facts |
| AC-4 | T-SR-4.1 | Agent specs prohibit external references |
| AC-5 | T-SR-5.1 | Agent specs define gap handling (assumption/escalation) |

### Story: Citation Requirements

| AC | Test ID | Scenario |
|----|---------|----------|
| AC-1 | T-CR-1.1 | Agent specs define citation format |
| AC-2 | T-CR-2.1 | Agent specs mention section-level citations |
| AC-3 | T-CR-3.1 | Agent specs distinguish assumptions from facts |
| AC-4 | T-CR-4.1 | Agent specs reference business_context citations |
| AC-5 | T-CR-5.1 | Agent specs require traceable chain |

### Story: Confidentiality

| AC | Test ID | Scenario |
|----|---------|----------|
| AC-1 | T-CF-1.1 | Agent specs prohibit verbatim business context |
| AC-2 | T-CF-2.1 | Agent specs prohibit external entity names |
| AC-3 | T-CF-3.1 | Agent specs prohibit external service exposure |
| AC-4 | T-CF-4.1 | Agent specs require self-contained outputs |
| AC-5 | T-CF-5.1 | Agent specs require confidentiality escalation |

### Story: Escalation Protocol

| AC | Test ID | Scenario |
|----|---------|----------|
| AC-1 | T-EP-1.1 | Agent specs define escalation for missing info |
| AC-2 | T-EP-2.1 | Agent specs define escalation for ambiguity |
| AC-3 | T-EP-3.1 | Agent specs define escalation for conflicts |
| AC-4 | T-EP-4.1 | Agent specs define confidentiality escalation |
| AC-5 | T-EP-5.1 | Agent specs allow explicit assumptions |
| AC-6 | T-EP-6.1 | Agent specs prefer "not available" over hallucination |

---

## Key Assumptions

- Guardrails are added as a dedicated section in each AGENT_*.md file
- All 4 agents receive the same guardrail rules (Alex, Cass, Nigel, Codey)
- Tests verify text presence via keyword/phrase matching, not exact wording
- Guardrails section header uses "Guardrails" or "guardrails" (case-insensitive)
- Per FEATURE_SPEC.md section 6: rules apply uniformly to all agents

---

## Traceability

| Story | ACs | Test IDs | Coverage |
|-------|-----|----------|----------|
| Source Restrictions | AC-1 to AC-5 | T-SR-1.1 to T-SR-5.1 | 100% |
| Citation Requirements | AC-1 to AC-5 | T-CR-1.1 to T-CR-5.1 | 100% |
| Confidentiality | AC-1 to AC-5 | T-CF-1.1 to T-CF-5.1 | 100% |
| Escalation Protocol | AC-1 to AC-6 | T-EP-1.1 to T-EP-6.1 | 100% |
