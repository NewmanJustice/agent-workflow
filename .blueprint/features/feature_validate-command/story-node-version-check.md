# Story — Node.js Version Check

## User story
As a developer, I want the validation to check my Node.js version so that I am warned before attempting to run the pipeline on an unsupported runtime.

---

## Context / scope
- Developer using orchestr8 CLI
- Node.js version may or may not meet minimum requirement (>=18)
- This check should work even on older Node.js versions to report the issue

See feature spec: `.blueprint/features/feature_validate-command/FEATURE_SPEC.md`

---

## Acceptance criteria

**AC-1 — Version check passes on Node 18+**
- Given I am running Node.js version 18 or higher,
- When I run `orchestr8 validate`,
- Then the Node.js version check displays a pass indicator.

**AC-2 — Version check fails on Node < 18**
- Given I am running Node.js version lower than 18,
- When I run `orchestr8 validate`,
- Then the Node.js version check displays a fail indicator
- And the current version is shown in the output.

**AC-3 — Command does not crash on old Node**
- Given I am running an older Node.js version,
- When I run `orchestr8 validate`,
- Then the command executes and reports the version failure
- And the command does not throw a runtime exception.

**AC-4 — Clear upgrade guidance**
- Given the Node.js version check fails,
- When fix suggestions are displayed,
- Then guidance includes "Upgrade Node.js to version 18 or higher"
- And the current detected version is shown.

**AC-5 — Version detected from runtime**
- Given I run `orchestr8 validate`,
- When the Node.js version check executes,
- Then the version is detected from `process.version` (not from package.json or external sources).

---

## Out of scope
- Checking for specific minor/patch versions
- Checking for Node.js feature availability beyond version number
- nvm or version manager integration
