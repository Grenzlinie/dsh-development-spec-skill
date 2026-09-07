# Agent Note: Seat Hold API

Status: implemented

## Problem

Checkout clients need a short-lived, exclusive claim on a seat while a purchase is in progress. Network retries must not duplicate creates or confirmations, concurrent buyers must not both occupy the same seat, and clients need to distinguish active, confirmed, cancelled, and expired outcomes through HTTP. State and creation-idempotency outcomes must survive a service restart using the same data store.

## Decision

The product owner explicitly approved the product contract, state semantics, scope, and acceptance meaning on 2026-08-14 after rejecting two earlier contract drafts. The service implements that approved contract with FastAPI, Python, and SQLite.

`POST /holds` accepts non-blank `seat_id`, `customer_id`, and `idempotency_key`, plus optional `ttl_seconds` from 1 through 900 with a default of 120. A first create returns `201`. An exact normalized replay returns the durable original hold with `200` and does not extend expiry; key reuse with a changed seat, customer, or TTL returns `409`. Responses contain stable `id`, `seat_id`, `customer_id`, `state`, `created_at`, and `expires_at`.

`GET /holds/{hold_id}` returns current state. `POST /holds/{hold_id}/confirm` changes `ACTIVE` to `CONFIRMED` and is state-idempotent. `DELETE /holds/{hold_id}` changes only `ACTIVE` to `CANCELLED` and returns `204` only for the first success. Unknown resources return `404`, and invalid state transitions return `409`. Expiry is materialized at `expires_at <= injected UTC now` on relevant reads or mutations. `ACTIVE` and permanently `CONFIRMED` holds occupy a seat; `CANCELLED` and `EXPIRED` holds release it.

SQLite stores the complete hold and idempotency input. Mutations use `BEGIN IMMEDIATE`, a five-second busy timeout, and WAL mode. A partial unique index on `seat_id` where state is `ACTIVE` or `CONFIRMED` is the database-level occupancy invariant. The application factory accepts a database path and clock; production uses a configurable durable path and system UTC, while tests use temporary databases and a mutable clock.

## Alternatives considered

**Fixed-only TTL.** Rejected by the product owner because clients require a bounded TTL override.

**Header idempotency key.** Rejected by the product owner in favor of an explicit creation field.

**Periodic expiry worker.** Not selected because lazy transactional expiry satisfies the approved observable contract without a second lifecycle.

**Application-only conflict checking.** Not selected because read-then-write logic can race; the partial unique index preserves the invariant even if calls interleave.

**Silent repeated cancellation.** Rejected by the product owner; only the first `ACTIVE -> CANCELLED` transition returns `204`, and later attempts return `409`.

## Verification

| Criteria | Command or procedure | Layer | Result |
|---|---|---|---|
| AC1, AC2, AC4, AC5, AC6 | `.venv/bin/python -m pytest -q tests/test_api.py` | HTTP integration with real temporary SQLite and fake UTC clock | PASS: `8 passed in 0.09s`; covers default and boundary TTL, stable representation, exact replay, input conflicts, restart persistence, expiry boundary, transitions, errors, and OpenAPI. |
| AC3 | `.venv/bin/python -m pytest -q tests/test_concurrency.py` | HTTP/database concurrency | PASS: `5 passed in 0.04s`; five synchronized same-seat races each assert one `201` and one `409`. |
| AC1–AC6 | `.venv/bin/python -m pytest -q` | Regression | PASS: `13 passed in 0.11s`. |
| AC7 | `.venv/bin/python -m ruff check .` | Static | PASS: `All checks passed!`. |
| AC7 | `.venv/bin/python -m build` | Production package | PASS after network permission was granted: built `seat_hold_api-0.1.0.tar.gz` and `seat_hold_api-0.1.0-py3-none-any.whl`. Generated artifacts are removed before delivery. |
| AC7 | Start Uvicorn with `SEAT_HOLD_DB=/tmp/candidate-a-seat-hold-smoke.sqlite3` and request `GET /openapi.json` | Assembled local run | PASS after localhost bind permission was granted: application startup completed, HTTP status was `200`, and shutdown completed. Temporary DB and response file were removed. |
| AC7 | `python ../../../../.codex/skills/spec-driven-development/scripts/specctl.py verify --root . --require-note` | Governance | Recorded in `evidence/first-pass.json` after the implemented-note transition. |
| AC1–AC7 | Review source, tests, docs, lock, generated artifacts, and this Note against the approved contract | Agent review | PASS after adding WAL consistency, repeat concurrency races, restart conflict evidence, TTL upper-bound evidence, and OpenAPI status/state assertions. No unapproved scope remains. |

## Consequences

- The committed `uv.lock`, package configuration, API docs, contributor docs, tests, and current decision record describe the same first-pass behavior.
- Holds and idempotency keys have no retention cleanup and the database can grow indefinitely; retention remains an explicit non-goal.
- Lazy expiry can leave an `ACTIVE` value at rest until a relevant API call observes it, while HTTP behavior and seat allocation remain current.
- SQLite is the supported single-database boundary. Horizontal or multi-database deployment needs a new product and persistence decision.
- Authentication, authorization, payment, seat catalog, extension/list/admin APIs, and background expiry are not implemented.
