# Agent Note: Fresh Python 3.13 Test Import

Status: implemented

## Problem

The first-pass hidden check ran the documented locked test command in a fresh Python 3.13 environment. Pytest collection failed because `tests/test_api.py` imports `tests.conftest`, while `tests` was not an importable package. The same 13 product tests passed only with an undocumented `PYTHONPATH=.` override, so the delivered verification path was not reproducible.

## Decision

The coordinator authorized the single standard repair on 2026-08-14 without changing the approved product contract or acceptance meaning. `tests/__init__.py` now makes the existing test-helper import explicit and portable. The handoff identifies `UV_CACHE_DIR=/tmp/dsh-sdd-uv-cache uv run --frozen --all-groups pytest -q` as the primary fresh locked reproducibility gate; it requires no `PYTHONPATH` override.

## Alternatives considered

**Set `PYTHONPATH=.` in the handoff.** Rejected because it would hide the import defect behind an environment override and leave the reported acceptance failure unresolved.

**Import `conftest` as a top-level module.** Rejected because pytest conftest discovery is not a reusable helper interface; the existing explicit package import is clearer once the package marker exists.

**Move the clock helper into production code.** Rejected because test organization does not justify enlarging production scope.

## Verification

| Outcome | Command | Result |
|---|---|---|
| Fresh Python 3.13 locked test execution without `PYTHONPATH` | `UV_CACHE_DIR=/tmp/dsh-sdd-uv-cache uv run --frozen --all-groups pytest -q` | PASS: `13 passed in 0.13s`. |
| Focused HTTP integration | `.venv/bin/python -m pytest -q tests/test_api.py` | PASS: `8 passed in 0.09s`. |
| Repeated SQLite concurrency | `.venv/bin/python -m pytest -q tests/test_concurrency.py` | PASS: `5 passed in 0.05s`. |
| Static analysis | `.venv/bin/python -m ruff check .` | PASS: `All checks passed!`. |
| Distribution build | `.venv/bin/python -m build` | PASS: built `seat_hold_api-0.1.0.tar.gz` and `seat_hold_api-0.1.0-py3-none-any.whl`. |
| Governance | `python3 ../../../../.codex/skills/spec-driven-development/scripts/specctl.py verify --root . --require-note` | Final result is recorded in `evidence/final.json` after this Note transitions. |

## Consequences

- Supported fresh environments collect the suite directly from the committed lock and documented command.
- The repair changes only test packaging and verification documentation; application source, API behavior, dependencies, and assertions are unchanged.
- Generated environment, cache, build, egg metadata, bytecode, coverage, and database artifacts are removed after final verification.
