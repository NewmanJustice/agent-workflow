# Story — Escalation Protocol

## User story

As a user of murmur8, I want agents to escalate to me when they encounter ambiguity or missing information so that I can provide guidance rather than agents guessing incorrectly.

---

## Context / scope

- Applies to all agents: Alex, Cass, Nigel, Codey
- Per FEATURE_SPEC.md section 6, Rule 5: "Agents must escalate to the user under defined conditions rather than proceeding with guesses"
- Per SYSTEM_SPEC.md section 7: "No silent changes: Agents flag deviations; do not silently alter specifications"

---

## Acceptance criteria

**AC-1 — Escalation on missing critical information**
- Given information required for a task is not present in provided inputs,
- When the information cannot be safely assumed (domain-specific, policy-related, or high-impact),
- Then the agent escalates to the user with a clear question explaining what information is needed and why.

**AC-2 — Escalation on significant ambiguity**
- Given inputs are ambiguous in a way that significantly affects output,
- When multiple interpretations are possible,
- Then the agent lists the possible interpretations and asks the user to clarify before proceeding.

**AC-3 — Escalation on source conflict**
- Given different input sources contain conflicting information,
- When the conflict cannot be resolved by recency or specificity rules,
- Then the agent flags the conflict, cites both sources, and asks the user to resolve.

**AC-4 — Escalation on confidentiality concern**
- Given a task would require violating confidentiality constraints,
- When no acceptable alternative approach exists,
- Then the agent explains the concern and requests user guidance.

**AC-5 — Explicit assumptions when escalation not warranted**
- Given information is missing but a safe default exists,
- When the assumption is low-risk and reversible,
- Then the agent may proceed with an explicit assumption labelled as "ASSUMPTION:" or "NOTE: Assuming..." rather than escalating.

**AC-6 — Anti-hallucination preference**
- Given an agent lacks information to answer a question,
- When asked to produce content,
- Then the agent states "This information is not available in the provided inputs" rather than inventing an answer.

---

## Out of scope

- Automated escalation routing or ticketing
- Escalation SLAs or response time requirements
- Multi-user escalation workflows
