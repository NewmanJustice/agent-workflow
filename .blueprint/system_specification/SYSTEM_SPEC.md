# System Specification — murmur8

## 1. Purpose & Intent

**murmur8** is a multi-agent workflow framework that automates feature development from specification to implementation. It coordinates four specialized AI agents (Alex, Cass, Nigel, Codey) through a sequential pipeline, ensuring that features are explicitly specified, documented with user stories, tested, and implemented with traceability.

**Why this system exists:**
- To transform feature ideas into working, tested code through a structured, repeatable process
- To maintain coherence between specifications, stories, tests, and implementation
- To reduce ambiguity and drift by enforcing explicit handoffs between agents

**Who it exists for:**
- Developers using Claude Code who want automated, spec-driven feature development
- Teams seeking a structured approach to AI-assisted software engineering

**What success looks like:**
- Features are implemented with full traceability from spec to code
- Tests are written before implementation, providing a stable contract
- All artifacts (specs, stories, tests, code) are aligned and consistent

**What must not be compromised:**
- Explicit specification before implementation
- Test-first development contracts
- Agent role boundaries and handoff integrity

---

## 2. Business & Domain Context

murmur8 operates in the domain of AI-assisted software development, specifically within the Claude Code CLI environment.

**Relevant drivers:**
- Growing adoption of AI coding assistants
- Need for structured processes to guide AI-generated code
- Requirement for traceability and quality assurance in automated development

**Domain constraints:**
- Operates within Claude Code's Task tool for spawning sub-agents
- Subject to Claude's token limits (optimized via incremental writes)
- Relies on file-based artifacts for persistence and handoffs

**Assumptions:**
- Users have Node.js 18+ installed
- Users have Claude Code CLI available
- Projects use standard testing frameworks (Jest, Node test runner)
- The `.business_context/` directory contains project-specific domain knowledge

---

## 3. System Boundaries

### In Scope

- **CLI tooling:** `init`, `update`, `skills`, `add-skills`, `queue` commands
- **Agent orchestration:** Sequential pipeline via `/implement-feature` skill
- **Artifact management:** Feature specs, user stories, test specs, tests, implementation plans
- **Queue persistence:** Recovery and resumption from `.claude/implement-queue.json`
- **Skills integration:** Installing optional skills from skills.sh ecosystem

### Out of Scope

- Runtime test execution environment (assumes existing test infrastructure)
- CI/CD integration (users configure their own pipelines)
- Project-specific business logic (provided via `.business_context/`)
- IDE integration beyond Claude Code CLI

---

## 4. Actors & Roles

### Human User
- **Description:** Developer invoking murmur8 commands and the `/implement-feature` skill
- **Primary goals:** Automate feature development, maintain control over scope and quality
- **Authority:** Final arbiter on intent, scope, and breaking changes; can pause/abort pipeline

### Alex (System Specification & Chief-of-Staff)
- **Description:** Creates and maintains system and feature specifications
- **Primary goals:** Prevent drift, ensure coherence, produce feature specs for downstream agents
- **Authority:** Can define and evolve specifications; cannot make unilateral product decisions

### Cass (Story Writer / Business Analyst)
- **Description:** Translates feature specs into user stories and acceptance criteria
- **Primary goals:** Produce explicit, testable, behaviour-first stories
- **Authority:** Elaborates specifications into stories; does not introduce unspecified behaviour

### Nigel (Tester)
- **Description:** Creates test specifications and executable tests from user stories
- **Primary goals:** Expose ambiguities, provide stable test contracts
- **Authority:** Defines test coverage; does not implement production code

### Codey (Developer)
- **Description:** Implements features according to plans and test contracts
- **Primary goals:** Make tests pass, maintain code quality
- **Authority:** Writes implementation code; does not modify tests without agreement

---

## 5. Core Domain Concepts

### Feature
- **Definition:** A bounded unit of functionality identified by a slug (e.g., `user-auth`)
- **Key attributes:** slug, feature spec, user stories, tests, implementation plan
- **Lifecycle:** Created by Alex, elaborated by Cass, tested by Nigel, implemented by Codey

### Pipeline Stage
- **Definition:** A discrete phase in the feature development workflow
- **Key attributes:** agent owner, input artifacts, output artifacts
- **Stages:** alex, cass, nigel, codey-plan, codey-implement, auto-commit

### Queue
- **Definition:** Persistent state tracking features through the pipeline
- **Key attributes:** current, alexQueue, cassQueue, nigelQueue, codeyQueue, completed, failed
- **Lifecycle:** Created on first run, updated at each stage transition, cleared on completion

### Artifact
- **Definition:** A file produced by an agent as output
- **Types:** SYSTEM_SPEC.md, FEATURE_SPEC.md, story-*.md, test-spec.md, *.test.js, IMPLEMENTATION_PLAN.md

### Skill
- **Definition:** A Claude Code command that provides specialized agent capabilities
- **Key attributes:** name, description, prompt template
- **Lifecycle:** Installed via `add-skills`, invoked via slash commands

---

## 6. High-Level Lifecycle & State Model

### Pipeline Lifecycle

```
INIT → ALEX → CASS → NIGEL → CODEY_PLAN → CODEY_IMPLEMENT → COMMIT → COMPLETE
                                ↓
                             PAUSED (--pause-after)
                                ↓
                             RESUME
```

### Feature States

| State | Entry Condition | Exit Condition |
|-------|----------------|----------------|
| **pending** | Feature slug provided | Agent starts processing |
| **in_progress** | Agent spawned for stage | Agent completes or fails |
| **completed** | All stages pass, commit done | Moved to completed list |
| **failed** | Agent error or abort | Moved to failed list |

### Recovery
- On re-invocation, pipeline reads `current.stage` from queue and resumes
- Failed features can be retried or restarted from scratch

---

## 7. Governing Rules & Invariants

### Pipeline Rules
- **Sequential execution:** Agents execute in order (Alex → Cass → Nigel → Codey)
- **Artifact gates:** Each stage requires output artifacts before proceeding
- **System spec gate:** Pipeline cannot proceed without SYSTEM_SPEC.md

### Agent Rules
- **Single responsibility:** Each agent has defined inputs and outputs; no overlap
- **No silent changes:** Agents flag deviations; do not silently alter specifications
- **Incremental output:** All agents write one file at a time to avoid token limits

### Queue Rules
- **Single current:** Only one feature can be `current` at a time
- **Immutable completed:** Completed features are not re-processed unless explicitly restarted
- **Recovery-safe:** Queue file enables resumption after failures

### Implementation Rules
- **Tests are contracts:** Codey implements against tests, not around them
- **No test deletion:** Tests cannot be removed without explicit approval
- **Green suite required:** Implementation is complete only when all tests pass

---

## 8. Cross-Cutting Concerns

### Traceability
- Every test maps to acceptance criteria (AC → Test ID table)
- Every story maps to feature spec sections
- Commit messages reference artifacts and agents

### Token Limit Management
- Incremental file writes (one file at a time)
- Brief summaries (5 bullets max)
- Reference by path instead of quoting content
- Consolidated artifacts (Nigel: 2 files, not 4)

### Failure Handling
- Each agent spawn offers: retry, skip, abort
- Failures are recorded with stage, reason, and timestamp
- Queue persists state for recovery

### Observability
- Queue status available via `murmur8 queue`
- Each agent provides completion summary
- Commit messages document pipeline execution

---

## 9. Non-Functional Expectations

### Reliability
- Pipeline resumes from last checkpoint on failure
- Queue file is gitignored to avoid conflicts
- Deterministic output given same inputs

### Performance
- Optimized for Claude's 4096 output token limit
- Incremental processing reduces memory pressure
- Skills installed once per project

### Extensibility
- Skills can be added per-agent from skills.sh ecosystem
- Agent specifications can be customized in `.blueprint/agents/`
- Business context directory allows project-specific grounding

### Maintainability
- `update` command replaces framework files while preserving user content
- Clear separation: framework dirs (replaced) vs user dirs (preserved)

---

## 10. Known Gaps, Risks & Open Questions

### Known Limitations
- Pipeline is sequential; no parallel agent execution
- Single-feature focus; no batch processing
- Assumes Node.js testing ecosystem

### Risks
- Token limit errors if agents generate excessive output
- Agent specifications may need tuning for non-standard projects
- Skill installation requires network access

### Open Questions
- Should agents support alternative testing frameworks?
- Could pipeline stages be made configurable or skippable?
- How to handle features that span multiple repositories?

---

## 11. Change Log (System-Level)

| Date | Change | Reason | Approved By |
|------|--------|--------|-------------|
| 2026-02-24 | Initial system specification | Document murmur8 v2.5.0 | Alex |
