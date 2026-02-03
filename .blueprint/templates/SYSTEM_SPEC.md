# System Specification — <System Name>

## 1. Purpose & Intent
**Why this system exists.**

- Problem the system is solving
- Who it exists for
- What success looks like in business terms
- What *must not* be compromised

> This section anchors all future decisions.  
> If a feature contradicts this, Alex must flag it.

---

## 2. Business & Domain Context
**Grounded in `.business_context`.**

- Relevant policy, legislation, or organisational drivers
- Domain constraints the system must respect
- Known external pressures (operational, judicial, regulatory, etc.)

**Assumptions**
- Explicit assumptions currently being made
- What is expected to change over time

---

## 3. System Boundaries
**What is in scope vs out of scope.**

### In Scope
- Capabilities this system explicitly owns

### Out of Scope
- Capabilities intentionally excluded
- Adjacent systems or manual processes

---

## 4. Actors & Roles
**Who interacts with the system and how.**

For each actor:
- Actor name
- Description
- Primary goals
- Authority level (what they can and cannot do)

---

## 5. Core Domain Concepts
**Shared language and meanings.**

For each concept:
- Name
- Definition
- Key attributes
- Lifecycle relevance (if applicable)

> This is the canonical vocabulary.  
> Feature specs and stories must not redefine these silently.

---

## 6. High-Level Lifecycle & State Model
**How the system behaves over time.**

- Key lifecycle phases
- High-level states
- Entry / exit conditions
- Terminal vs non-terminal states

Notes:
- Known complexity or ambiguity
- Areas expected to evolve

---

## 7. Governing Rules & Invariants
**What must always be true.**

- Business rules that must not be violated
- Legal or policy invariants
- Cross-feature constraints

Examples:
- “X cannot occur unless Y has happened”
- “Once in state Z, only A or B are permitted”

---

## 8. Cross-Cutting Concerns
**Concerns that affect multiple features.**

- Multi-party behaviour
- Divergence / convergence
- Auditability
- Transparency
- Accessibility
- Observability
- Resilience / failure handling

---

## 9. Non-Functional Expectations (System-Level)
**Not exhaustive NFRs, but system intent.**

- Performance expectations (qualitative)
- Reliability expectations
- Security posture
- Scalability assumptions

---

## 10. Known Gaps, Risks & Open Questions
**Explicit uncertainty.**

- Known weak points in the design
- Open policy or domain questions
- Areas where future features are expected to challenge the system

---

## 11. Change Log (System-Level)
| Date | Change | Reason | Approved By |
|-----|------|--------|-------------|
|     |      |        |             |
