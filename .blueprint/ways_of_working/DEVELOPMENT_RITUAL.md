# Development Ritual (with CLI + Failure Modes)

This document defines:
- the **core ritual**
- a **CLI checklist** agents must walk through
- **micro-rituals for failure modes**

A stage is not complete until its ritual is satisfied.

---

## 🔁 Core Ritual (Summary)

1️⃣ Story → Tester  
2️⃣ Tester → Developer  
3️⃣ Developer → QA  

Tests define behaviour. QA validates intent.

---

## 🖥️ CLI Agent Ritual Checklist

Agents should **print this checklist to the CLI** at the start of their work and explicitly tick items as they complete them.

### Example CLI pattern

```text
[ ] Read story and acceptance criteria
[ ] Read tester understanding & test plan
[ ] Ran baseline tests
[ ] Implemented behaviour
[ ] Tests passing
[ ] Lint passing
[ ] Summary written
```
### Tester CLI Ritual (Nigel)
Before writing tests:
[ ] Story has a single clear goal
[ ] Acceptance criteria are testable
[ ] Ambiguities identified
[ ] Assumptions written down

Before handover to Steve to pass to Claude:
[ ] Understanding summary written
[ ] Test plan created
[ ] Happy path tests written
[ ] Edge/error tests written
[ ] Tests runnable via npm test
[ ] Traceability table complete
[ ] Open questions listed

If any box is unchecked → raise it with Steve that its not ready to hand over. If all boxes are checked, let Steve know that its ready to handover to Claude. 

🧑‍💻 Developer CLI Ritual (Claude)
Before coding:
[ ] Read story + ACs
[ ] Read tester understanding
[ ] Read executable tests
[ ] Ran baseline tests (expected failures only)

During coding:
[ ] Implemented behaviour incrementally
[ ] Ran relevant tests after each change
[ ] Did not weaken or delete tests

Before handover to Steve:
[ ] All tests passing
[ ] Lint passing
[ ] No unexplained skip/todo
[ ] Changes summarised
[ ] Assumptions restated

If tests pass but confidence is low → trigger a failure-mode ritual.

🚨 Failure-Mode Micro-Rituals
These rituals override normal flow. When triggered, stop and follow them explicitly.
❓ Tests pass, but behaviour feels wrong
Trigger when:
- UX feels off
- behaviour technically matches tests but not intent
- something feels “too easy”
Ritual:
[ ] Re-read original user story
[ ] Re-state intended behaviour in plain English
[ ] Identify mismatch: story vs tests vs implementation
[ ] Decide:
    - tests are wrong
    - story is underspecified
    - implementation misinterpreted behaviour
Outcome:
Update tests (Tester)
Clarify ACs (Story owner)
Fix implementation (Developer)
Never “let it slide”.

🧪 Tests are unclear or contradictory
Trigger when:
- assertions conflict
- test names don’t match expectations 
- passing tests don’t explain behaviour
Ritual:
[ ] Identify specific confusing test(s)
[ ] State what behaviour they appear to encode
[ ] Compare to acceptance criteria
[ ] Propose corrected test behaviour
Outcome:
- Tester revises tests
- Developer does not guess

🔁 Tests are failing for non-behaviour reasons
Trigger when:
- environment/setup issues
- brittle timing
- global state leakage
Ritual:
[ ] Confirm failure is not missing behaviour
[ ] Isolate failing test
[ ] Remove flakiness or hidden coupling
[ ] Re-run full suite
Outcome:
- Stabilise tests before continuing feature work

⚠️ Developer changed behaviour to make tests pass
Trigger when:
- implementation feels forced
- logic seems unnatural or overly complex
Ritual:
[ ] Pause implementation
[ ] Identify which test is driving awkward behaviour
[ ] Re-check acceptance criteria
[ ] Raise concern to Tester / QA
Outcome:
- Adjust tests or clarify intent
- Prefer simpler behaviour aligned to story

🧭 Meta-Rules (Always On)
❗ Tests are the behavioural contract
❗ Green builds are necessary, not sufficient
❗ Assumptions must be written down
❗ No silent changes
❗ When in doubt, slow down and ask Steve
