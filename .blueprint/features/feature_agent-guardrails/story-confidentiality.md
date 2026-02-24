# Story — Confidentiality

## User story

As a user of orchestr8, I want agents to treat business context and project content as confidential so that sensitive information is not leaked in outputs or exposed to external services.

---

## Context / scope

- Applies to all agents: Alex, Cass, Nigel, Codey
- Per FEATURE_SPEC.md section 6, Rule 3: "Agents must treat `.business_context/` content as confidential and prevent data leakage"
- Per FEATURE_SPEC.md section 9, Open Question 3: "treat all project content as confidential by default"

---

## Acceptance criteria

**AC-1 — Business context not exposed verbatim**
- Given an agent processes content from `.business_context/` directory,
- When the agent produces output artifacts,
- Then the output does not reproduce confidential details verbatim; instead it uses generic descriptions or summarises appropriately.

**AC-2 — External entities not referenced by name**
- Given an agent is aware of external projects, companies, or implementations from business context,
- When producing output,
- Then the agent does not reference these external entities by name in specifications, stories, or code comments.

**AC-3 — No external service exposure**
- Given an agent is processing project content,
- When external services would expose project data (e.g., external APIs, logging services),
- Then the agent does not use such services and keeps all processing local to the pipeline.

**AC-4 — Self-contained outputs**
- Given an agent produces an output artifact,
- When the artifact is reviewed in isolation,
- Then it does not require access to confidential business context to be understood; it is self-contained.

**AC-5 — Confidentiality conflict escalation**
- Given an output would require exposing confidential details,
- When no acceptable redaction or generalisation is possible,
- Then the agent flags the conflict and escalates to the user for guidance before proceeding.

---

## Out of scope

- Encryption or access control mechanisms for business context files
- Audit logging of confidential data access
- Data loss prevention (DLP) tooling integration
