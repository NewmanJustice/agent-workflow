# Development Ritual

This document defines:
- The **pipeline stages** and what each agent must deliver
- **Checklists** each agent must satisfy before handoff
- **Failure-mode rituals** that override normal flow when triggered
- The **feedback and handoff** mechanisms that connect stages

A stage is not complete until its checklist is satisfied.

---

## Pipeline Stages

```
Alex (feature spec) → Cass (user stories) → Nigel (tests) → Codey (plan → implement) → Auto-commit → Human QA
```

Each agent reads the previous agent's outputs and produces artifacts for the next. Context is passed via **handoff summaries** (max 30 lines) to keep token usage efficient. The pipeline uses a **feedback chain** where each agent rates the previous agent's work before starting their own.

Tests define behaviour. The human validates intent after auto-commit.

---

## Handoff Mechanism

Between stages, the pipeline creates a handoff summary (`handoff-{agent}.md`, max 30 lines) that passes key context to the next agent. This keeps each agent focused without re-reading everything from scratch.

Each agent also provides **feedback** on the previous agent's output:
- **Rating** (1-5) on quality
- **Issues** list (if any)
- **Recommendation**: `proceed`, `pause`, or `revise`

If the rating falls below the configured threshold (default: 3.0), the pipeline pauses for human review. See `feedback-config` for threshold settings.

---

## Agent Checklists

### Alex (System Specification)

Before writing the feature spec:
- [ ] Read the system specification
- [ ] Read relevant business context (`.business_context/`)
- [ ] Read the feature template

Before handoff:
- [ ] Feature spec written to `FEATURE_SPEC.md`
- [ ] Intent, scope, actors, rules, and dependencies covered
- [ ] Ambiguities flagged explicitly
- [ ] Assumptions labelled as such
- [ ] Spec aligns with system boundaries

### Cass (Story Writer)

Before writing stories:
- [ ] Read the feature spec
- [ ] Read the system specification for context
- [ ] Identified primary behaviour, entry/exit conditions, branching logic

Before handoff:
- [ ] Each story file (`story-{slug}.md`) has a single clear goal
- [ ] Acceptance criteria are in Given/When/Then, max 5-7 per story
- [ ] Routing is explicit (no "goes to next screen")
- [ ] Out-of-scope items listed
- [ ] Assumptions flagged

### Nigel (Tester)

Before writing tests:
- [ ] Read all story files and the feature spec
- [ ] Acceptance criteria are testable
- [ ] Ambiguities identified
- [ ] Assumptions written down

Before handoff:
- [ ] `test-spec.md` written (understanding, AC-to-test mapping, assumptions)
- [ ] Executable test file written
- [ ] Happy path tests written
- [ ] Edge case and error tests written
- [ ] Tests runnable via the project's configured test command (see `.claude/stack-config.json`)
- [ ] Traceability table complete (every AC mapped to test IDs)
- [ ] Open questions listed

If any box is unchecked, raise it before handoff.

### Codey (Developer) — Planning

Before writing the plan:
- [ ] Read feature spec, stories, test-spec, and executable tests
- [ ] Built mental model of happy path, edge cases, error flows
- [ ] Identified what already exists vs what is new

Before handoff:
- [ ] `IMPLEMENTATION_PLAN.md` written (summary, files table, steps, risks)
- [ ] Steps ordered to make tests pass incrementally
- [ ] No implementation code written yet

### Codey (Developer) — Implementation

Before coding:
- [ ] Read implementation plan and tests
- [ ] Ran baseline tests (note expected failures)

During coding:
- [ ] Implemented behaviour incrementally (one file at a time)
- [ ] Ran tests after each file change
- [ ] Did not weaken or delete Nigel's tests

Before handoff:
- [ ] All tests passing
- [ ] Lint passing
- [ ] No unexplained `skip` or `todo`
- [ ] Changes summarised (files changed, test status, blockers)
- [ ] Assumptions restated

If tests pass but confidence is low, trigger a failure-mode ritual (see below).

---

## Failure-Mode Rituals

These override normal flow. When triggered, stop and follow the steps explicitly.

### Tests pass, but behaviour feels wrong

**Trigger:** Behaviour technically matches tests but not intent, or something feels "too easy."

- [ ] Re-read the original user story
- [ ] Re-state intended behaviour in plain English
- [ ] Identify mismatch: story vs tests vs implementation
- [ ] Decide: tests are wrong, story is underspecified, or implementation misinterpreted behaviour

**Outcome:** Update tests (Nigel), clarify ACs (Cass), or fix implementation (Codey). Never "let it slide."

### Tests are unclear or contradictory

**Trigger:** Assertions conflict, test names don't match expectations, or passing tests don't explain behaviour.

- [ ] Identify the specific confusing test(s)
- [ ] State what behaviour they appear to encode
- [ ] Compare to acceptance criteria
- [ ] Propose corrected test behaviour

**Outcome:** Nigel revises tests. Codey does not guess.

### Tests fail for non-behaviour reasons

**Trigger:** Environment/setup issues, brittle timing, or global state leakage.

- [ ] Confirm failure is not missing behaviour
- [ ] Isolate failing test
- [ ] Remove flakiness or hidden coupling
- [ ] Re-run full suite

**Outcome:** Stabilise tests before continuing feature work.

### Implementation feels forced

**Trigger:** Logic seems unnatural or overly complex to make tests pass.

- [ ] Pause implementation
- [ ] Identify which test is driving the awkward behaviour
- [ ] Re-check acceptance criteria
- [ ] Raise concern to the human

**Outcome:** Adjust tests or clarify intent. Prefer simpler behaviour aligned to the story.

---

## Meta-Rules (Always On)

- Tests are the behavioural contract
- Green builds are necessary, not sufficient
- No silent changes — all assumptions written down
- When in doubt, slow down and ask the human

See `GUARDRAILS.md` for the full shared constraints (source restrictions, escalation protocol, anti-patterns).
