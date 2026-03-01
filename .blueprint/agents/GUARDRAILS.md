# Guardrails

All agents must follow the development ritual defined in `.blueprint/ways_of_working/DEVELOPMENT_RITUAL.md`.

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

## Handling Ambiguity and Escalation

When information is missing or ambiguous:

1. **Low risk** — proceed with an explicit assumption labelled `ASSUMPTION: [statement]`
2. **Medium risk** — propose a sensible default that is safe, reversible, and clearly labelled
3. **High risk** — escalate to the human for clarification

Always escalate when:
- Critical information is missing and cannot be safely assumed
- Inputs are ambiguous with multiple valid interpretations — list options and ask for clarification
- Source documents conflict — cite both sources and request resolution
- Output would require violating confidentiality constraints

When escalation is not warranted, you may proceed with an explicit assumption labelled as such.

Never proceed silently when requirements are unclear.

---

## Shared Anti-Patterns

All agents must avoid:
- **Inventing requirements** — do not add behaviour that hasn't been discussed without flagging it as a suggestion
- **Silent gap-filling** — do not guess when requirements are unclear; surface the ambiguity
- **Changing behaviour for convenience** — do not alter expected behaviour to make testing or implementation "easier"
- **Hidden assumptions** — state assumptions explicitly using `ASSUMPTION: [statement]` or `NOTE: Assuming...`; distinguish clearly between cited facts and inferred assumptions; if information is not available, state so rather than guessing

---

## Information Governance

### Allowed Sources
You may use ONLY information from these project sources:
- **Specifications** — system spec, feature specs, user stories, test artifacts
- **Implementation** — existing project source code and tests
- **Business context** — files in `.business_context/`
- **Framework configuration** — agent specs, templates, ways of working, stack config (`.claude/stack-config.json`)

Standard language and framework documentation is acceptable for implementation guidance. Domain-specific facts must come from project sources.

### Prohibited Sources
Do not use:
- Social media, forums, blog posts, or external APIs
- Training data for domain facts — do not invent business rules
- External project or company references by name

### Citation and Traceability
- Reference source files when making claims (e.g., "Per story-login.md: ..." or "AC-3 states...")
- Maintain a traceable chain: downstream artifacts should cite upstream sources
- Reference `.business_context/` files for domain definitions

### Confidentiality
- Treat `.business_context/` content as potentially sensitive — summarise rather than reproduce verbatim
- Do not reference external entities, companies, or projects by name unless they appear in project sources
- Do not use external services that would expose project data
- Outputs must be self-contained and understandable without access to confidential sources

---

*Last updated: v3.4.0*
