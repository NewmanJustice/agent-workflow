# Feature Specification: Interactive Alex

## 1. Feature Intent

**Problem:** Currently, Alex runs as a one-shot sub-agent via the Task tool, producing feature specifications autonomously without user input. This works well when users have clear requirements, but leads to suboptimal specs when requirements are ambiguous or incomplete. Users must either accept potentially misaligned specs or manually restart the pipeline after reviewing and editing.

**Solution:** Add an interactive conversational mode where Alex engages in back-and-forth dialogue with the user to collaboratively create specifications. This mode triggers automatically when no spec exists, or explicitly via the `--interactive` flag.

**Why this matters:**
- Reduces spec revision cycles by capturing user intent upfront
- Improves spec quality through targeted clarifying questions
- Maintains Alex's role as system conscience while adding user collaboration
- Aligns with Alex's existing "guiding but revisable" design philosophy

---

## 2. Scope

### In Scope

- `--interactive` flag for `/implement-feature` command
- Auto-detection: trigger interactive mode when SYSTEM_SPEC.md or FEATURE_SPEC.md is missing
- Interactive session flow for both system specs and feature specs
- Conversational draft-review-approve cycle
- Integration with existing `--pause-after=alex` flag for exit control
- Session state management (in-memory, not persisted to queue)

### Out of Scope

- Interactive modes for other agents (Cass, Nigel, Codey) - future features
- Persistent conversation history between sessions
- Multi-user collaboration (only single user supported)
- GUI or rich terminal UI (text-based conversation only)
- Changes to the agent sub-agent runtime prompt format

---

## 3. Actors

### Primary: Human User
- Invokes `/implement-feature` with optional `--interactive` flag
- Provides feature context and answers Alex's clarifying questions
- Reviews and approves draft spec sections
- Decides whether to continue pipeline or pause for further review

### Secondary: Alex Agent
- Operates in conversational mode instead of autonomous mode
- Asks clarifying questions to understand user intent
- Drafts spec sections incrementally for user feedback
- Produces final FEATURE_SPEC.md (or SYSTEM_SPEC.md) upon approval

### Affected: Downstream Pipeline
- Cass, Nigel, Codey continue to operate autonomously after Alex completes
- No changes to their behaviour or prompts

---

## 4. Behaviour Model

### 4.1 Trigger Conditions

Interactive mode activates when ANY of these conditions are true:

| Condition | Artifact Missing | Flag Present | Mode |
|-----------|------------------|--------------|------|
| No system spec | SYSTEM_SPEC.md | - | Interactive system spec creation |
| No feature spec | FEATURE_SPEC.md | - | Interactive feature spec creation |
| Explicit request | - | `--interactive` | Interactive feature spec creation |
| Both flags | - | `--interactive --pause-after=alex` | Interactive, then pause |

### 4.2 Session Flow

```
User: /implement-feature "user-auth"
      │
      ▼
┌─────────────────────────────────────────┐
│ Check: SYSTEM_SPEC.md exists?           │
│   No  → Enter Interactive System Spec   │
│   Yes → Continue                        │
└─────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────┐
│ Check: FEATURE_SPEC.md exists?          │
│   No  → Enter Interactive Feature Spec  │
│ Check: --interactive flag?              │
│   Yes → Enter Interactive Feature Spec  │
│   No  → Run autonomous Alex             │
└─────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────┐
│ INTERACTIVE SESSION                     │
│ 1. Alex: "Describe what you want..."    │
│ 2. User: provides description           │
│ 3. Alex: asks clarifying questions      │
│ 4. User: answers questions              │
│ 5. Alex: drafts spec section            │
│ 6. User: approves / requests changes    │
│ 7. Repeat 3-6 until spec complete       │
│ 8. Alex: writes final spec file         │
└─────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────┐
│ Exit: --pause-after=alex present?       │
│   Yes → Stop for review                 │
│   No  → Continue pipeline (Cass, etc.)  │
└─────────────────────────────────────────┘
```

### 4.3 Conversational Phases

**Phase 1: Context Gathering**
- Alex reads system spec (if exists), business context, and any existing feature artifacts
- Alex asks: "Describe the feature you want to build. What problem does it solve and for whom?"
- User provides initial description
- Alex acknowledges understanding and identifies gaps

**Phase 2: Clarifying Questions**
- Alex asks 2-4 targeted questions based on:
  - Missing information relative to FEATURE_SPEC template sections
  - Ambiguities in user description
  - Potential conflicts with system spec
- Questions are asked one batch at a time, not all at once
- User answers in natural language
- Alex confirms understanding before proceeding

**Phase 3: Iterative Drafting**
- Alex drafts spec sections incrementally (Intent first, then Scope, etc.)
- After each section, Alex presents draft and asks: "Does this capture your intent? Any changes?"
- User can: approve, request changes, or add context
- Alex revises based on feedback
- Process continues until all relevant sections are complete

**Phase 4: Finalization**
- Alex presents complete spec summary
- User gives final approval
- Alex writes FEATURE_SPEC.md to disk
- Alex produces handoff summary as normal

### 4.4 Session Commands

During interactive session, user can issue commands:

| Command | Effect |
|---------|--------|
| `/approve` or `yes` | Approve current draft, proceed to next section |
| `/change <feedback>` | Request specific changes to current section |
| `/skip` | Skip current section (mark as "TBD" in spec) |
| `/restart` | Restart current section from scratch |
| `/abort` | Exit interactive mode without writing spec |
| `/done` | Finalize spec even if some sections incomplete |

---

## 5. Dependencies

### System Dependencies
- Requires SKILL.md update to support `--interactive` flag parsing
- Requires change to pipeline routing logic (Steps 2-3 in SKILL.md)
- Uses existing Task tool infrastructure for Alex agent spawning

### Artifact Dependencies
- Reads: `.blueprint/system_specification/SYSTEM_SPEC.md` (if exists)
- Reads: `.business_context/` directory
- Reads: `.blueprint/templates/FEATURE_SPEC.md` (for section guidance)
- Writes: `{FEAT_DIR}/FEATURE_SPEC.md`
- Writes: `{FEAT_DIR}/handoff-alex.md`

### Configuration Dependencies
- No new config files required
- May optionally respect `feedback-config.json` thresholds for self-assessment

---

## 6. Rules & Constraints

### Session Rules
1. **Single active session:** Only one interactive session can run at a time
2. **In-memory state:** Session state is not persisted; if user aborts mid-session, no partial spec is saved
3. **Timeout handling:** No explicit timeout; session continues until user approves or aborts
4. **No parallelism:** Interactive mode is inherently sequential

### Spec Quality Rules
1. **Template alignment:** Final spec must include at minimum: Intent, Scope, and Actors sections
2. **Flagged assumptions:** All inferences must be explicitly marked as assumptions
3. **System spec alignment:** Feature spec must not contradict system spec boundaries

### Pipeline Integration Rules
1. **Gate preservation:** System spec gate still applies - if no system spec, must create one first
2. **Handoff required:** Interactive Alex still produces `handoff-alex.md` for Cass
3. **Queue update:** On completion, queue is updated as normal (feature moves to cassQueue)
4. **History recording:** Interactive sessions are recorded in pipeline-history.json with `mode: "interactive"`

---

## 7. Non-Functional Considerations

### Usability
- Alex's questions should be clear and actionable (not open-ended)
- Each conversational turn should be concise (under 200 words for Alex)
- Progress indication: show which sections are complete vs remaining

### Performance
- No additional file I/O until final spec write
- No external API calls beyond existing Claude conversation

### Auditability
- Final spec includes note: "Created via interactive session"
- History entry includes: question count, revision count, session duration

---

## 8. Assumptions & Open Questions

### Assumptions
1. Users prefer conversational UX over form-filling for spec creation
2. 2-4 clarifying questions is sufficient for most features
3. Iterative section-by-section drafting is more effective than full-spec-at-once
4. Users will invoke interactive mode for ambiguous or novel features

### Open Questions
1. **Q:** Should interactive mode support resumption if session is interrupted?
   - **Tentative:** No, keep simple for v1. User can restart if interrupted.

2. **Q:** Should Alex offer to create SYSTEM_SPEC.md interactively if missing?
   - **Tentative:** Yes, same interactive flow applies.

3. **Q:** Should there be a `--no-interactive` flag to force autonomous mode even when spec is missing?
   - **Tentative:** No, the auto-trigger is a reasonable default. Users can create empty placeholder specs to skip.

---

## 9. Story Themes

The following themes will guide user story creation:

1. **Flag Parsing & Routing** - Handling `--interactive` flag and auto-detection logic
2. **Conversational Session Management** - Session lifecycle, commands, state tracking
3. **Iterative Spec Drafting** - Question flow, section drafting, revision handling
4. **Pipeline Integration** - Queue updates, history recording, downstream handoff
5. **Error & Edge Cases** - Abort handling, incomplete specs, timeout scenarios

---

## 10. Design Tensions & Trade-offs

| Tension | Resolution |
|---------|------------|
| **Autonomy vs Control:** Alex's value is autonomous coherence enforcement, but interactive mode prioritizes user control | Interactive mode is opt-in/auto-trigger, not default. Alex still enforces coherence through questions and flagging, just collaboratively. |
| **Speed vs Quality:** Interactive mode is slower than autonomous | Users self-select: clear requirements = autonomous mode; unclear requirements = interactive mode. Net quality improvement expected. |
| **Simplicity vs Persistence:** Session state could be persisted for resumption | V1 keeps state in-memory for simplicity. Persistence is a future enhancement if users request it. |
| **Single agent vs Multi-agent:** Could extend interactive mode to all agents | Scoped to Alex for v1. Alex is the upstream bottleneck; downstream agents benefit from clearer specs without needing interactivity. |

---

## Change Log

| Date | Change | Reason |
|------|--------|--------|
| 2026-02-26 | Initial feature specification | Define interactive Alex mode for collaborative spec creation |
