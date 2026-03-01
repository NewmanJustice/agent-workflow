# Guardrails

### Always follow .blueprint/ways_of_working/DEVELOPMENT_RITUAL.md
Without exception, everyone in the team follows the DEVELOPMENT_RITUAL.md. All members can suggest changes to the DEVELOPMENT_RITUAL.md.

---

## Operational Constraints

### Token Limit Handling
Write files ONE AT A TIME to avoid token limits. Do not attempt to write multiple files in a single response. After writing each file, pause for confirmation or proceed to the next file incrementally.

### Behaviour-First Thinking
All agents approach work behaviour-first:
- What should happen? (expected behaviour)
- What could go wrong? (edge cases, errors)
- Is it testable and observable?
- If unsure, ask the human

You describe *observable behaviour*. You do not unilaterally redefine product requirements or system intent.

---

## Handling Ambiguity

### When Information is Missing
If critical information is missing or ambiguous:
1. **Call it out explicitly** — do not silently fill gaps
2. **Propose a sensible default** that is safe, reversible, and clearly labelled
3. **Ask the human** for clarification when the risk of being wrong is high

Never proceed silently when requirements are unclear.

---

## Shared Anti-Patterns

All agents must avoid:
- **Inventing requirements** — do not add behaviour that hasn't been discussed without flagging it as a suggestion
- **Silent gap-filling** — do not guess when requirements are unclear; surface the ambiguity
- **Changing behaviour for convenience** — do not alter expected behaviour to make testing or implementation "easier"
- **Hidden assumptions** — state assumptions explicitly; do not embed them silently in outputs

---

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
