# orchestr8

A multi-agent workflow framework for automated feature development. Four specialized AI agents collaborate in sequence to take features from specification to implementation.

## Agents

| Agent | Role |
|-------|------|
| **Alex** | System Specification & Chief-of-Staff — creates/maintains specs, guards design coherence |
| **Cass** | Story Writer/BA — translates specs into testable user stories |
| **Nigel** | Tester — converts stories into executable tests and test plans |
| **Codey** | Developer — implements code to satisfy tests (test-first) |

## Installation

```bash
npx agent-workflow init
```

This installs the `.blueprint/` directory and `SKILL.md` into your project. If files already exist, you'll be prompted before overwriting. It also adds the workflow queue to `.gitignore`.

### Commands

| Command | Description |
|---------|-------------|
| `npx agent-workflow init` | Initialize `.blueprint/` and `SKILL.md` in your project |
| `npx agent-workflow update` | Update agents, templates, and rituals to latest version |
| `npx agent-workflow add-skills [agent]` | Install recommended skills for an agent (alex, cass, nigel, codey, all) |
| `npx agent-workflow skills [agent]` | List recommended skills |
| `npx agent-workflow help` | Show help |

The `update` command preserves your content in `features/` and `system_specification/` while updating the framework files. Your `.business_context/` directory is separate from `.blueprint/` and unaffected by updates.

### Optional Skills

Each agent has recommended skills from the [skills.sh](https://skills.sh) ecosystem that enhance their capabilities:

| Agent | Skills |
|-------|--------|
| **Alex** | `avoid-feature-creep`, `feature-spec` |
| **Cass** | `user-story-writing` |
| **Nigel** | `javascript-testing-patterns`, `modern-javascript-patterns` |
| **Codey** | `javascript-expert`, `modern-javascript-patterns` |

```bash
npx agent-workflow add-skills all     # Install all recommended skills
npx agent-workflow add-skills codey   # Install skills for Codey only
```

## Usage

Run the pipeline with the `/implement-feature` skill in Claude Code:

```bash
/implement-feature                                    # Interactive
/implement-feature "user-auth"                        # New feature
/implement-feature "user-auth" --update-feature-spec  # Update spec
/implement-feature "user-auth" --update-story "login" # Update story
/implement-feature --update-system-spec               # Update system spec
```

### Pipeline Flow

```
New Feature:    Alex → Cass → Nigel → Codey → Commit
Update Story:   Cass → Nigel → Codey → Commit
Update Feature: Alex → cascade check
Update System:  Alex → cascade check
```

## Directory Structure

```
your-project/
├── .blueprint/
│   ├── agents/                    # Agent specifications
│   │   ├── AGENT_SPECIFICATION_ALEX.md
│   │   ├── AGENT_BA_CASS.md
│   │   ├── AGENT_TESTER_NIGEL.md
│   │   └── AGENT_DEVELOPER_CODEY.md
│   ├── templates/                 # Spec templates
│   │   ├── SYSTEM_SPEC.md
│   │   └── FEATURE_SPEC.md
│   ├── ways_of_working/           # Development rituals
│   ├── features/                  # Feature specs (created per feature)
│   └── system_specification/      # System spec (created on first run)
├── .business_context/             # Business context documents
│   └── README.md
└── SKILL.md
```

## How It Works

1. **Alex** gates on the system spec — creates it if missing, then routes to the appropriate workflow
2. **Cass** writes user stories with acceptance criteria from the feature spec
3. **Nigel** creates test plans, behavior matrices, and executable tests
4. **Codey** implements code to pass the tests, then auto-commits

The pipeline maintains a queue (`.claude/implement-queue.json`) to track progress and enable recovery on failure.

## License

MIT
