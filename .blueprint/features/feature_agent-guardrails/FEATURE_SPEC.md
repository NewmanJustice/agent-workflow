# Feature Specification — Agent Guardrails

## 1. Feature Intent

**Why this feature exists.**

The murmur8 framework relies on four AI agents (Alex, Cass, Nigel, Codey) operating autonomously within a pipeline. Without explicit guardrails, these agents may:

- Generate content based on training data rather than provided inputs
- Reference external sources (social media, forums, web content) that are unreliable or inappropriate
- Expose confidential business context in outputs
- Produce non-deterministic or hallucinated content that cannot be traced to authoritative sources

**Problem being addressed:**
Uncontrolled information sourcing and output generation creates risks around accuracy, confidentiality, and auditability in automated feature development.

**User need:**
Users need confidence that agent outputs are grounded exclusively in provided inputs (specs, code, business_context, templates) and that confidential information is protected.

**System purpose alignment:**
Per `.blueprint/system_specification/SYSTEM_SPEC.md`: "What must not be compromised: Explicit specification before implementation" and "All artifacts (specs, stories, tests, code) are aligned and consistent." Guardrails directly support these principles by ensuring agents produce traceable, consistent outputs.

---

## 2. Scope

### In Scope

- **Source restrictions**: Rules governing what information sources agents may and may not use
- **Grounding requirements**: Citation and traceability standards for all agent assertions
- **Confidentiality constraints**: Rules for protecting `.business_context/` content and preventing data leakage
- **Determinism expectations**: Standards for reproducible, consistent agent behaviour
- **Escalation protocols**: Clear rules for when agents must stop and ask the user
- **Anti-hallucination measures**: Explicit preference for "I don't have this information" over guessing

### Out of Scope

- Technical enforcement mechanisms (runtime validation, content filtering)
- Monitoring or auditing infrastructure for guardrail compliance
- Changes to the pipeline flow or agent sequencing
- Modifications to CLI tooling or queue management
- Integration with external guardrail services or APIs

---

## 3. Actors Involved

### Alex (System Specification & Chief-of-Staff)
- **What they can do**: Define system and feature specifications grounded in provided inputs; cite sources for all assertions; flag missing information
- **What they cannot do**: Use external sources; invent business rules not found in inputs; expose confidential context in specifications

### Cass (Story Writer & Business Analyst)
- **What they can do**: Translate specifications into user stories citing the feature spec; make explicit assumptions when information is missing
- **What they cannot do**: Reference external examples or implementations; introduce behaviour not derived from specifications

### Nigel (Tester)
- **What they can do**: Create tests based on user stories and acceptance criteria; note assumptions explicitly
- **What they cannot do**: Use external testing patterns without attribution; invent requirements beyond what stories specify

### Codey (Developer)
- **What they can do**: Implement against tests and specifications; make implementation assumptions explicit
- **What they cannot do**: Use code from external sources without flagging; modify behaviour beyond what tests require

### Human User
- **What they can do**: Provide source materials; respond to escalations; approve assumptions
- **What they cannot do**: N/A (human user is the authority)

---

## 4. Behaviour Overview

**Happy-path behaviour:**

1. Agent receives task with explicit inputs (specs, stories, tests, code, business_context)
2. Agent processes ONLY the provided inputs to produce outputs
3. Agent cites sources for all assertions using standard format: "Per [filename]: [claim]" or "[filename:section] states..."
4. Agent flags any gaps or assumptions explicitly rather than filling them silently
5. Agent produces self-contained outputs that do not leak confidential context
6. Given identical inputs, agent produces consistent outputs

**Key alternatives or branches:**

- **Missing information path**: When required information is not in provided inputs, agent explicitly states "This information is not available in the provided inputs" and either (a) makes an explicit assumption labelled as such, or (b) escalates to the user
- **Ambiguity path**: When inputs are ambiguous, agent lists possible interpretations and asks the user to clarify
- **Confidentiality conflict path**: When an output would require exposing confidential context, agent flags this and asks for guidance

**User-visible outcomes:**

- All agent outputs contain traceable citations to source files
- Assumptions are explicitly labelled and distinguishable from facts
- Outputs are self-contained and do not reference confidential details by name
- Re-running the pipeline with identical inputs produces consistent results

---

## 5. State & Lifecycle Interactions

This feature is **state-constraining** rather than state-creating or state-transitioning.

**States affected:**
- All pipeline stages (alex, cass, nigel, codey-plan, codey-implement) are constrained by guardrails
- Guardrails apply regardless of whether a feature is pending, in_progress, or being resumed

**No new states introduced:**
The feature adds behavioural constraints to existing states without modifying the state model defined in `.blueprint/system_specification/SYSTEM_SPEC.md` section 6.

---

## 6. Rules & Decision Logic

### Rule 1: Source Restriction Rule

**Description:** Agents must use ONLY information from explicitly provided inputs.

**Inputs:** Task context, file references, `.business_context/` directory contents

**Outputs:** Agent output grounded exclusively in provided inputs

**Deterministic:** Yes

**Allowed sources:**
- System specification (`.blueprint/system_specification/SYSTEM_SPEC.md`)
- Feature specifications (`.blueprint/features/*/FEATURE_SPEC.md`)
- User stories (`story-*.md`)
- Test artifacts (`test-spec.md`, `*.test.js`)
- Implementation code in the project
- Business context (`.business_context/*`)
- Templates (`.blueprint/templates/*`)
- Agent specifications (`.blueprint/agents/AGENT_*.md`)

**Prohibited sources:**
- Social media (Twitter/X, Reddit, LinkedIn, Facebook, etc.)
- Forums, blog posts, or user-generated web content
- Web searches or external APIs
- Training data for domain-specific facts
- External project implementations or company references

---

### Rule 2: Citation Rule

**Description:** All assertions about requirements, behaviour, or domain knowledge must cite their source.

**Inputs:** Agent assertions about the system or domain

**Outputs:** Assertion with citation in format: "Per [filename]: [claim]" or "[filename:section] states..."

**Deterministic:** Yes

**Examples:**
- "Per FEATURE_SPEC.md: Users must authenticate before accessing the dashboard"
- "Per story-login.md:AC-3: Failed login attempts are logged"
- ".business_context/glossary.md defines 'tenant' as..."

---

### Rule 3: Confidentiality Rule

**Description:** Agents must treat `.business_context/` content as confidential and prevent data leakage.

**Inputs:** Any content from `.business_context/` directory

**Outputs:** Outputs that do not expose confidential details

**Deterministic:** Yes

**Constraints:**
- Do not reference external projects, companies, or implementations by name
- Do not use external services that would expose project data
- Output artifacts should be self-contained
- Generic descriptions preferred over specific confidential details

---

### Rule 4: Assumption Declaration Rule

**Description:** When information is not available in provided inputs, agents must explicitly declare assumptions.

**Inputs:** Gap in provided information

**Outputs:** Explicit assumption statement labelled as such

**Deterministic:** Yes

**Format:**
- "ASSUMPTION: [statement] - This is not specified in the provided inputs"
- "NOTE: Assuming [X] in absence of explicit guidance"

---

### Rule 5: Escalation Rule

**Description:** Agents must escalate to the user under defined conditions rather than proceeding with guesses.

**Inputs:** Trigger conditions (listed below)

**Outputs:** Escalation request to user

**Deterministic:** Yes

**Escalation triggers:**
- Information required for the task is not in provided inputs AND cannot be safely assumed
- Ambiguity in inputs that significantly affects output
- Conflict between different input sources
- Request would require violating confidentiality constraints
- Uncertainty that could lead to material misalignment

---

### Rule 6: Determinism Rule

**Description:** Same inputs should produce consistent outputs across runs.

**Inputs:** Identical task context and input files

**Outputs:** Consistent agent outputs

**Deterministic:** Yes (by definition)

**Implications:**
- Avoid incorporating timestamps or random elements unless explicitly required
- Avoid referencing volatile or external state
- Structure outputs to be reproducible

---

## 7. Dependencies

### System Components
- Agent specifications (`.blueprint/agents/AGENT_*.md`) - must be updated to incorporate guardrails
- Pipeline orchestration (`SKILL.md` / `/implement-feature`) - no changes required, but agents must apply guardrails

### External Systems
- None (guardrails specifically prohibit external dependencies)

### Policy Dependencies
- None identified

### Operational Dependencies
- Users must provide adequate input materials (business_context, specs) for agents to work from
- Teams adopting murmur8 must understand that agents will escalate when information is insufficient

---

## 8. Non-Functional Considerations

### Auditability
- Citation format enables traceability from outputs back to source inputs
- Assumption labels enable review of agent decisions
- Escalation log provides audit trail of human decisions

### Reliability
- Determinism rule supports reproducible builds and debugging
- Explicit assumptions reduce hidden failure modes

### Security / Confidentiality
- Confidentiality constraints protect business-sensitive information
- Prohibition on external services prevents data exposure

### Performance
- No significant performance impact expected
- Guardrails are behavioural constraints, not runtime checks

---

## 9. Assumptions & Open Questions

### Assumptions

1. **Input sufficiency**: Users will provide adequate input materials for agents to complete tasks without excessive escalation
2. **Agent compliance**: Guardrails are specification-level constraints that agents will follow; no technical enforcement mechanism is assumed
3. **Citation overhead**: The additional effort of citing sources is acceptable given the traceability benefits
4. **Escalation tolerance**: Users accept that agents will ask clarifying questions rather than guessing

### Open Questions

1. **Granularity of citation**: Should citations reference file-level or section-level? (Recommendation: section-level where feasible)
2. **Assumption threshold**: What level of assumption is acceptable before escalation is required? (Recommendation: err on the side of escalation for domain-specific matters)
3. **Confidentiality scope**: Should confidentiality constraints extend beyond `.business_context/` to include implementation code? (Recommendation: yes, treat all project content as confidential by default)

---

## 10. Impact on System Specification

**Does this feature reinforce, stretch, or contradict existing system assumptions?**

This feature **reinforces** existing system assumptions, particularly:

- Per SYSTEM_SPEC.md section 7 (Governing Rules & Invariants): "No silent changes: Agents flag deviations; do not silently alter specifications" - guardrails extend this principle
- Per SYSTEM_SPEC.md section 8 (Cross-Cutting Concerns): "Traceability" - citation requirements directly support traceability goals
- Per SYSTEM_SPEC.md section 9 (Non-Functional Expectations): "Deterministic output given same inputs" - determinism rule makes this explicit

**Potential system spec enhancement:**

Section 7 (Governing Rules & Invariants) could be extended with a new subsection "Agent Guardrails" that codifies these constraints at the system level. This is a **non-breaking enhancement** that strengthens existing principles.

---

## 11. Handover to BA (Cass)

### Story Themes

Cass should derive stories around four main themes:

1. **Source Restriction Stories**: Stories covering what agents can and cannot reference when producing outputs
2. **Citation & Traceability Stories**: Stories defining how agents cite sources and maintain traceability
3. **Confidentiality Stories**: Stories ensuring business context remains protected
4. **Escalation & Assumption Stories**: Stories defining when and how agents escalate vs. assume

### Expected Story Boundaries

- Each guardrail rule (Rules 1-6 in section 6) likely maps to one or more stories
- Stories should be agent-agnostic where possible (guardrails apply to all agents)
- Stories should include acceptance criteria that can be verified by reviewing agent outputs

### Areas Needing Careful Story Framing

- **Balancing thoroughness vs. practicality**: Citation requirements should not create excessive overhead
- **Escalation threshold**: Stories should clarify when escalation is warranted vs. when reasonable assumption is acceptable
- **Confidentiality boundaries**: What exactly constitutes "confidential" and what is acceptable to reference

---

## 12. Change Log (Feature-Level)

| Date | Change | Reason | Raised By |
|------|--------|--------|-----------|
| 2026-02-24 | Initial feature specification | Define comprehensive guardrails for agent behaviour | Alex |
