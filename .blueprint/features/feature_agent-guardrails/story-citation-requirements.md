# Story — Citation Requirements

## User story

As a user of murmur8, I want all agent assertions to cite their source files so that I can trace claims back to authoritative inputs and verify correctness.

---

## Context / scope

- Applies to all agents: Alex, Cass, Nigel, Codey
- Per FEATURE_SPEC.md section 6, Rule 2: "All assertions about requirements, behaviour, or domain knowledge must cite their source"
- Per SYSTEM_SPEC.md section 8: "Traceability" is a cross-cutting concern

---

## Acceptance criteria

**AC-1 — Standard citation format used**
- Given an agent makes an assertion about requirements or behaviour,
- When the assertion is included in output,
- Then the assertion includes a citation in one of the standard formats: "Per [filename]: [claim]" or "[filename:section] states...".

**AC-2 — Section-level citations where feasible**
- Given an agent cites a source file with multiple sections,
- When the assertion relates to a specific section,
- Then the citation includes the section reference (e.g., "FEATURE_SPEC.md section 6" or "story-login.md:AC-3").

**AC-3 — Assumptions distinguished from cited facts**
- Given an agent includes both cited facts and assumptions in output,
- When the output is reviewed,
- Then assumptions are clearly labelled (e.g., "ASSUMPTION:" prefix) and distinguishable from cited assertions.

**AC-4 — Domain knowledge grounded in business context**
- Given an agent makes assertions about business or domain concepts,
- When those concepts are defined in `.business_context/` files,
- Then the assertion cites the specific business context file (e.g., ".business_context/glossary.md defines...").

**AC-5 — Traceable chain maintained**
- Given a downstream artifact (story, test, code) references upstream artifacts,
- When the reference is made,
- Then it includes sufficient citation to trace back to the source (story cites feature spec, test cites story, implementation cites test).

---

## Out of scope

- Automated citation validation tooling
- Link checking or broken reference detection
- Citation index or cross-reference reports
