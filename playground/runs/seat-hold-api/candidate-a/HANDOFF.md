# First-pass handoff

## Install

From this directory, with Python 3.11+ and `uv` installed:

```sh
UV_CACHE_DIR=/tmp/seat-hold-api-uv-cache uv sync --frozen --all-groups
```

`uv.lock` is committed and `--frozen` prevents dependency drift.

## Verify

The primary reproducibility gate creates/uses the locked environment and runs the full suite without a `PYTHONPATH` override:

```sh
UV_CACHE_DIR=/tmp/dsh-sdd-uv-cache uv run --frozen --all-groups pytest -q
```

After the install step, the equivalent focused and component checks are:

```sh
.venv/bin/python -m pytest -q tests/test_api.py
.venv/bin/python -m pytest -q tests/test_concurrency.py
.venv/bin/python -m pytest -q
.venv/bin/python -m ruff check .
.venv/bin/python -m build
.venv/bin/python ../../../../.codex/skills/spec-driven-development/scripts/specctl.py verify --root . --require-note
```

The build command creates `dist/` and egg metadata; remove those generated artifacts after inspecting the wheel and sdist. The delivered source tree intentionally omits `.venv`, caches, build output, coverage, and runtime databases.

## Run

```sh
SEAT_HOLD_DB=/absolute/path/to/seat-holds.sqlite3 \
  .venv/bin/python -m uvicorn seat_hold_api.app:app --host 127.0.0.1 --port 8000
```

Use a durable absolute path to preserve holds and idempotency outcomes across restarts. Browse `http://127.0.0.1:8000/docs` for the interactive contract. Stop with `Ctrl-C`.

## Production build

```sh
.venv/bin/python -m build
```

This produces an sdist and wheel from `pyproject.toml`; the service itself is run with Uvicorn as shown above.

## Limitations

There is no authentication, payment or seat catalog integration, background expiry, retention cleanup, listing/admin API, or distributed coordination. SQLite serializes write transactions and is the supported persistence boundary. A confirmed hold permanently occupies its seat within this service. Lazy expiry means a stale `ACTIVE` database row is changed to `EXPIRED` when that hold is read or its seat is mutated.
