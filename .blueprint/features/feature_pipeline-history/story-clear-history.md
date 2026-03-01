# Story — Clear Pipeline History

## User story

As a developer using murmur8, I want to clear the pipeline history so that I can reset metrics or remove stale data.

---

## Context / scope

- New CLI subcommand: `murmur8 history clear`
- Removes all entries from `.claude/pipeline-history.json`
- Per FEATURE_SPEC.md:Section 3 (Actors), users can clear history but cannot modify individual entries
- Destructive action requiring confirmation

---

## Acceptance criteria

**AC-1 — Clear with confirmation**
- Given `.claude/pipeline-history.json` contains history entries,
- When I run `murmur8 history clear`,
- Then I see a confirmation prompt: "This will delete all 25 history entries. Continue? (y/N)"
- And I must type 'y' or 'yes' to proceed.

**AC-2 — Clear executes on confirmation**
- Given I confirm the clear action,
- When the command completes,
- Then `.claude/pipeline-history.json` is reset to an empty array `[]`,
- And I see "Pipeline history cleared. 25 entries removed."

**AC-3 — Clear cancelled on decline**
- Given I decline the confirmation (type 'n', 'no', or press Enter),
- When the command completes,
- Then `.claude/pipeline-history.json` remains unchanged,
- And I see "Clear cancelled. History unchanged."

**AC-4 — Force clear without confirmation**
- Given `.claude/pipeline-history.json` contains history entries,
- When I run `murmur8 history clear --force`,
- Then the history is cleared without a confirmation prompt,
- And I see "Pipeline history cleared. 25 entries removed."

**AC-5 — Clear empty history**
- Given `.claude/pipeline-history.json` is empty or does not exist,
- When I run `murmur8 history clear`,
- Then I see "No history to clear."
- And the command exits with code 0.

---

## CLI interaction

```
$ murmur8 history clear
This will delete all 25 history entries. Continue? (y/N) y
Pipeline history cleared. 25 entries removed.

$ murmur8 history clear --force
Pipeline history cleared. 25 entries removed.

$ murmur8 history clear
No history to clear.
```

---

## Out of scope

- Clearing individual entries or filtered subsets
- Archiving history before clearing
- Undo/restore functionality
- Automatic cleanup based on age or count
