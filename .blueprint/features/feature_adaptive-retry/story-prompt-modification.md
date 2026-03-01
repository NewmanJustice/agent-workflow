# Story — Prompt Modification

## User Story

As a **developer using murmur8**, I want the **pipeline to modify agent prompts based on the selected retry strategy** so that **retry attempts have a better chance of success by adjusting the agent's instructions**.

---

## Context / Scope

- Per FEATURE_SPEC.md:Section 6 (Rule 3), strategies apply specific modifications to agent prompts
- Per FEATURE_SPEC.md:Section 11 (Areas Needing Careful Framing), the "rollback" strategy requires explicit user confirmation
- Per FEATURE_SPEC.md:Section 2 (Out of Scope), automatic prompt rewriting is not supported; strategies describe what to do
- Per SYSTEM_SPEC.md:Section 7 (Agent Rules), agents must not make silent changes

---

## Acceptance Criteria

**AC-1 — Apply "simplify-prompt" strategy**
- Given the user accepts a retry with the "simplify-prompt" strategy,
- When the agent is re-invoked,
- Then the prompt is modified to append: "Focus on core requirements only. Skip edge cases and optional sections.",
- And the modification is visible in the agent's task context.

**AC-2 — Apply "reduce-stories" strategy**
- Given the user accepts a retry with the "reduce-stories" strategy,
- When Cass is re-invoked,
- Then the prompt is modified to append: "Write only the 2-3 most critical user stories. Defer others to follow-up.",
- And the deferred stories are noted in the summary.

**AC-3 — Apply "simplify-tests" strategy**
- Given the user accepts a retry with the "simplify-tests" strategy,
- When Nigel is re-invoked,
- Then the prompt is modified to append: "Write only happy-path tests for each AC. Skip edge cases.",
- And edge case tests are explicitly deferred.

**AC-4 — Apply "add-context" strategy**
- Given the user accepts a retry with the "add-context" strategy,
- When the agent is re-invoked,
- Then relevant sections from previous stage outputs are prepended to the prompt,
- And the source of added context is indicated (e.g., "Context from FEATURE_SPEC.md:Section 4").

**AC-5 — Apply "incremental" strategy**
- Given the user accepts a retry with the "incremental" strategy,
- When Codey is re-invoked,
- Then the prompt is modified to append: "Implement one test at a time. Stop and report after each.",
- And each implementation step produces a discrete output before continuing.

**AC-6 — Apply "rollback" strategy with confirmation**
- Given the user accepts a retry with the "rollback" strategy,
- When the user confirms the destructive action,
- Then `git checkout -- .` is executed on implementation files before retry,
- And a confirmation prompt warns: "This will discard uncommitted changes to implementation files. Proceed? (y/n)".

**AC-7 — No modification for "retry" strategy**
- Given the user accepts a simple "retry" (no strategy modification),
- When the agent is re-invoked,
- Then the original prompt is used without any modification,
- And the retry proceeds identically to the first attempt.

---

## Strategy Reference Table

Per FEATURE_SPEC.md:Section 6 (Rule 3):

| Strategy | Modification Applied |
|----------|---------------------|
| `retry` | No modification |
| `simplify-prompt` | Append: "Focus on core requirements only. Skip edge cases and optional sections." |
| `reduce-stories` | Append: "Write only the 2-3 most critical user stories. Defer others to follow-up." |
| `simplify-tests` | Append: "Write only happy-path tests for each AC. Skip edge cases." |
| `add-context` | Prepend relevant sections from previous stage outputs |
| `incremental` | Append: "Implement one test at a time. Stop and report after each." |
| `rollback` | Execute `git checkout -- .` on implementation files before retry |

---

## Out of Scope

- Automatic prompt rewriting based on error analysis (per FEATURE_SPEC.md:Section 2)
- Custom user-defined prompt modifications (strategies are predefined)
- Modifying agent specifications themselves (per FEATURE_SPEC.md:Section 2)
- Combining multiple strategies in a single retry (one strategy per attempt)
