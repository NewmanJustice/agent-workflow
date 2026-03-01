# Story — Retry Configuration Management

## User Story

As a **developer using murmur8**, I want to **view, modify, and reset retry configuration** so that **I can customize how the pipeline handles failures based on my project's needs**.

---

## Context / Scope

- Per FEATURE_SPEC.md:Section 2, retry configuration is managed via `.claude/retry-config.json`
- Per FEATURE_SPEC.md:Section 3 (Actors), users retain final decision authority and can modify thresholds
- Per FEATURE_SPEC.md:Section 11 (Handover), this story covers CLI commands for `retry-config` and `retry-config reset`
- Configuration file is gitignored (per FEATURE_SPEC.md:Section 7)

---

## Acceptance Criteria

**AC-1 — View current configuration**
- Given the retry configuration file exists at `.claude/retry-config.json`,
- When I run `murmur8 retry-config`,
- Then the current configuration is displayed in a readable format showing thresholds, window size, max retries, and enabled strategies.

**AC-2 — View defaults when no configuration exists**
- Given no retry configuration file exists,
- When I run `murmur8 retry-config`,
- Then the hardcoded default configuration is displayed,
- And a message indicates "Using default configuration (no config file found)".

**AC-3 — Modify configuration value**
- Given I run `murmur8 retry-config set <key> <value>` (e.g., `murmur8 retry-config set maxRetries 5`),
- When the key is valid and value is of correct type,
- Then the configuration file is updated with the new value,
- And a confirmation message shows the updated setting.

**AC-4 — Reject invalid configuration key**
- Given I run `murmur8 retry-config set <invalidKey> <value>`,
- When the key is not recognized,
- Then an error message is displayed listing valid configuration keys,
- And no file modification occurs.

**AC-5 — Reset configuration to defaults**
- Given the retry configuration file exists with custom values,
- When I run `murmur8 retry-config reset`,
- Then the configuration file is replaced with default values,
- And a confirmation message indicates "Retry configuration reset to defaults".

**AC-6 — Create configuration file on first modification**
- Given no retry configuration file exists,
- When I run `murmur8 retry-config set <key> <value>`,
- Then the configuration file is created with default values plus the specified modification,
- And the file is created in `.claude/retry-config.json`.

**AC-7 — Handle corrupted configuration gracefully**
- Given the retry configuration file exists but contains invalid JSON,
- When I run `murmur8 retry-config`,
- Then an error message is displayed indicating the file is corrupted,
- And a suggestion to run `murmur8 retry-config reset` is shown.

---

## Configuration Schema

Per FEATURE_SPEC.md:Section 6 (Rules), default configuration includes:

```json
{
  "maxRetries": 3,
  "windowSize": 10,
  "highFailureThreshold": 0.2,
  "strategies": {
    "alex": ["simplify-prompt", "add-context"],
    "cass": ["reduce-stories", "simplify-prompt"],
    "nigel": ["simplify-tests", "add-context"],
    "codey-plan": ["add-context", "simplify-prompt"],
    "codey-implement": ["incremental", "rollback"]
  }
}
```

---

## Out of Scope

- Modifying strategy definitions themselves (strategies are code, not config)
- Per-feature configuration overrides (configuration is global)
- Configuration UI/interactive editor (CLI only)
- Validating strategy effectiveness (config is just data; strategy logic is separate)
