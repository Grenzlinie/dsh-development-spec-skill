# AGENTS.md

This repository develops and evaluates the [`spec-driven-development`](.codex/skills/spec-driven-development/SKILL.md) Skill. Read [architecture](docs/architecture.md), [development](docs/development.md), [testing](docs/testing.md), and the owning [Agent Note](.agents/notes/README.md) before non-trivial changes.

Use `DISCOVER → FRAME → SPECIFY → APPROVE → IMPLEMENT → VERIFY → REVIEW → RECORD`. Humans approve product outcomes, scope, non-goals, acceptance meaning, and costly or irreversible choices. Agents own reversible engineering decisions and escalate when they change the approved product.

Every non-trivial change adds or updates an Agent Note before production implementation. Keep code, tests, docs, experiment evidence, and the owning note synchronized. Use `python3 .codex/skills/spec-driven-development/scripts/specctl.py verify --root . --require-note` after deciding the change is non-trivial.

Do not overwrite experiment artifacts, reveal sealed oracles to builder agents, or edit another agent's assigned run directory. Preserve all six experiment source trees and evidence; exclude dependency directories, caches, coverage output, and build products.

Do not install Skills globally, commit, push, or open a pull request unless the user explicitly asks. Preserve unrelated work and report exact verification commands and results.
