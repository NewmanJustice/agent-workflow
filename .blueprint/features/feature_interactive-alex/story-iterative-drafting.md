# User Story: Iterative Spec Drafting

## Story

**As a** developer in an interactive session,
**I want** Alex to gather context, ask targeted questions, and draft spec sections incrementally,
**so that** the resulting specification accurately captures my intent with minimal revision cycles.

## Acceptance Criteria

### AC-1: Context Gathering Phase

**Given** an interactive session has started
**When** the user provides their initial feature description
**Then** Alex acknowledges understanding by summarizing the core intent
**And** Alex identifies 2-4 information gaps relative to the FEATURE_SPEC template

### AC-2: Clarifying Questions

**Given** Alex has identified information gaps
**When** Alex asks clarifying questions
**Then** questions are presented in a single batch (2-4 questions)
**And** questions are specific and actionable (not open-ended)
**And** Alex waits for user responses before proceeding

### AC-3: Section-by-Section Drafting

**Given** Alex has gathered sufficient context
**When** Alex drafts spec sections
**Then** sections are drafted incrementally (Intent first, then Scope, then Actors, etc.)
**And** after each section, Alex presents the draft
**And** Alex asks: "Does this capture your intent? Any changes?"

### AC-4: Revision Handling

**Given** Alex has presented a draft section
**And** the user requests changes via `/change <feedback>`
**When** Alex revises the section
**Then** Alex incorporates the specific feedback
**And** Alex presents the revised draft
**And** Alex asks for approval again

### AC-5: Progress Indication

**Given** an interactive session is active
**When** Alex transitions between sections
**Then** Alex indicates which sections are complete
**And** Alex indicates which sections remain

### AC-6: Concise Responses

**Given** Alex is drafting or responding in the session
**When** Alex produces conversational output
**Then** each response is under 200 words
**And** focus is on actionable content, not filler

## Out of Scope

- Full-spec-at-once drafting mode
- Configurable question count (fixed at 2-4)
- Template customization during session

## References

- Feature Spec: `.blueprint/features/feature_interactive-alex/FEATURE_SPEC.md` (Section 4.3)
