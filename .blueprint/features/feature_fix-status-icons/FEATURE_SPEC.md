# Feature Specification — Fix Status Icons

## 1. Feature Intent

The `STATUS_ICONS` object in `src/theme.js` uses legacy `parallel_*` keys, but the actual status strings in `src/murm.js` use `murm_*`. This creates a mismatch where icon lookups fail silently.

## 2. Scope

### In Scope
- Rename `parallel_queued` → `murm_queued`
- Rename `parallel_running` → `murm_running`
- Rename `parallel_complete` → `murm_complete`
- Rename `parallel_failed` → `murm_failed`
- Update tests that reference these keys

### Out of Scope
- Adding new icons
- Changing icon characters
- Refactoring theme.js structure

## 3. Actors
- **Developer**: Uses STATUS_ICONS for CLI output formatting

## 4. Behaviour Overview
After this change, `STATUS_ICONS[status]` will return the correct icon when `status` is one of the `murm_*` values from the state machine.

## 5. Files to Modify
| File | Change |
|------|--------|
| `src/theme.js` | Rename 4 keys in STATUS_ICONS |
| `test/feature_murmuration-theme.test.js` | Update key references |
| `test/feature_theme-adoption.test.js` | Update key references |

## 6. Change Log
| Date | Change | Reason | Raised By |
|------|--------|--------|-----------|
| 2026-03-03 | Initial spec | Complete v4.0 murm theming | Alex |
