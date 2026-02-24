# Implementation Plan — Agent Guardrails

## Summary

Add a standardised "Guardrails" section to all four agent specification files (AGENT_SPECIFICATION_ALEX.md, AGENT_BA_CASS.md, AGENT_TESTER_NIGEL.md, AGENT_DEVELOPER_CODEY.md). The section covers source restrictions, citation requirements, confidentiality constraints, and escalation protocols. This is a documentation-only change with no runtime code modifications.

---

## Files to Create/Modify

| Path | Action | Purpose |
|------|--------|---------|
| `.blueprint/agents/AGENT_SPECIFICATION_ALEX.md` | Modify | Add Guardrails section |
| `.blueprint/agents/AGENT_BA_CASS.md` | Modify | Add Guardrails section |
| `.blueprint/agents/AGENT_TESTER_NIGEL.md` | Modify | Add Guardrails section |
| `.blueprint/agents/AGENT_DEVELOPER_CODEY.md` | Modify | Add Guardrails section |

---

## Implementation Steps

1. **Read each agent spec file** to identify the best insertion point for the Guardrails section (after existing content, before any skills section if present).

2. **Add Guardrails section to AGENT_SPECIFICATION_ALEX.md** using the template below.

3. **Add Guardrails section to AGENT_BA_CASS.md** using the template below.

4. **Add Guardrails section to AGENT_TESTER_NIGEL.md** using the template below.

5. **Add Guardrails section to AGENT_DEVELOPER_CODEY.md** using the template below.

6. **Run tests** (`node --test test/feature_agent-guardrails.test.js`) to verify all 21 test assertions pass.

7. **Review outputs** to ensure no test failures remain.

---

## Guardrails Section Template

```markdown
## Guardrails

### Allowed Sources
You may use ONLY information from these sources:
- System specification (`.blueprint/system_specification/SYSTEM_SPEC.md`)
- Feature specifications (`.blueprint/features/*/FEATURE_SPEC.md`)
- User stories (`story-*.md`) and test artifacts (`test-spec.md`, `*.test.js`)
- Implementation code in the project
- Business context (`.business_context/*`)
- Templates (`.blueprint/templates/*`) and agent specifications

### Prohibited Sources
Do not use:
- Social media, forums, blog posts, or external APIs
- Training data for domain facts—do not invent business rules
- External project or company references by name

### Citation Requirements
- Cite sources using: "Per [filename]: [claim]" or "[filename:section] states..."
- Use section-level citations where feasible (e.g., "story-login.md:AC-3")
- Reference `.business_context/` files for domain definitions
- Maintain a traceable chain: downstream artifacts cite upstream sources

### Assumptions vs Facts
- Label assumptions explicitly: "ASSUMPTION: [statement]" or "NOTE: Assuming..."
- Distinguish clearly between cited facts and assumptions
- Do not guess—state "This information is not available in the provided inputs"

### Confidentiality
- Do not reproduce `.business_context/` content verbatim; summarise or use generic descriptions
- Do not reference external entities, companies, or projects by name
- Do not use external services that would expose project data
- Outputs must be self-contained and understandable without access to confidential sources

### Escalation Protocol
Escalate to the user when:
- Critical information is missing and cannot be safely assumed
- Inputs are ambiguous with multiple possible interpretations—list options and ask for clarification
- Source documents conflict—cite both sources and request resolution
- Output would require violating confidentiality constraints

When escalation is not warranted, you may proceed with an explicit assumption labelled as such.
```

---

## Risks/Questions

- **Insertion point consistency**: Each agent file has slightly different structure; insert before "Skills available" section if present, otherwise at end.
- **Test phrase matching**: Tests use case-insensitive substring matching; template wording must include trigger phrases from test file.
