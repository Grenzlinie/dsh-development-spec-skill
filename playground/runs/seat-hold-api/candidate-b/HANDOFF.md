# Seat Hold API handoff

## Requirements

- Python 3.11 or newer
- `venv` and `pip`

## Install

From this directory:

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.lock
.venv/bin/python -m pip install --no-deps -e .
```

## Test and build

```bash
.venv/bin/python -m pytest
.venv/bin/python -m pip wheel --no-deps --no-build-isolation -w dist .
```

The repository delivery omits `.venv`, `dist`, caches, coverage, and runtime DBs.

## Run

```bash
SEAT_HOLD_DB=./seat_holds.db .venv/bin/python -m uvicorn seat_hold_api.api:app --host 127.0.0.1 --port 8000
```

Open `http://127.0.0.1:8000/docs`. See `HTTP_API.md` for the behavioral contract.

## Design and operational notes

Each mutation uses a SQLite `BEGIN IMMEDIATE` transaction. A partial unique index
enforces at most one seat-consuming (`active` or `confirmed`) hold per exact
`seat_id`, so the invariant does not depend on application-only checks. A
confirmed hold permanently consumes its seat; cancellation and expiry release
only active holds. The default SQLite busy timeout is 10 seconds; overload can
therefore surface as a server error and should be paired with request
backpressure/monitoring in production.

Expiry is observed lazily on API activity; there is no background cleanup process.
Historical terminal rows and idempotency keys are retained indefinitely so
replays survive process restarts. For a larger deployment, define a retention
policy that preserves the required idempotency window and use a database service
or a single-writer deployment topology appropriate to the required availability.
