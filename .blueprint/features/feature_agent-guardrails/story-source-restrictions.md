# Story — Source Restrictions

## User story

As a user of orchestr8, I want agents to use only information from explicitly provided inputs so that outputs are grounded in authoritative sources and not hallucinated from training data or external content.

---

## Context / scope

- Applies to all agents: Alex, Cass, Nigel, Codey
- This is a behavioural constraint, not a runtime enforcement mechanism
- Per FEATURE_SPEC.md section 6, Rule 1: "Agents must use ONLY information from explicitly provided inputs"

---

## Acceptance criteria

**AC-1 — Allowed sources are used**
- Given an agent is processing a task,
- When the agent produces output,
- Then the output is derived exclusively from allowed sources: system specification, feature specifications, user stories, test artifacts, implementation code, business context, templates, and agent specifications.

**AC-2 — Prohibited sources are not used**
- Given an agent is processing a task,
- When the agent encounters a gap in provided inputs,
- Then the agent does not reference social media, forums, blog posts, web searches, external APIs, or external project implementations to fill that gap.

**AC-3 — Training data not used for domain facts**
- Given an agent needs domain-specific information (business rules, project requirements),
- When that information is not present in provided inputs,
- Then the agent does not use its training data to invent or assume domain facts; instead it flags the gap explicitly.

**AC-4 — External references not introduced**
- Given an agent is writing output artifacts,
- When the output references patterns, examples, or implementations,
- Then those references are to files within the project, not to external companies, products, or open-source projects.

**AC-5 — Gap handling triggers assumption or escalation**
- Given required information is not available in allowed sources,
- When the agent cannot proceed without this information,
- Then the agent either declares an explicit assumption (labelled as such) or escalates to the user.

---

## Out of scope

- Runtime validation or filtering of agent outputs
- Technical enforcement mechanisms (content blockers, API restrictions)
- Monitoring infrastructure for source compliance
