# Seat Hold API

A FastAPI + SQLite service for exclusive, expiring seat holds. SQLite persists holds and creation-idempotency results across restarts when the same database file is reused.

## HTTP contract

`POST /holds` accepts:

```json
{
  "seat_id": "A-12",
  "customer_id": "customer-42",
  "idempotency_key": "checkout-attempt-9",
  "ttl_seconds": 120
}
```

`ttl_seconds` is optional, defaults to 120, and must be an integer from 1 through 900. Blank identifiers and unknown request fields are rejected with `422`. The first create returns `201`. An exact replay of all normalized fields with the same `idempotency_key` returns the original hold with `200` and never extends its expiry. Reusing a key with a different seat, customer, or TTL returns `409`.

Hold responses contain stable `id`, `seat_id`, `customer_id`, `state`, `created_at`, and `expires_at`. Timestamps are RFC 3339 UTC. States are `ACTIVE`, `CONFIRMED`, `CANCELLED`, and `EXPIRED`.

- `GET /holds/{hold_id}` returns the current hold, lazily observing expiry, or `404`.
- `POST /holds/{hold_id}/confirm` changes `ACTIVE` to `CONFIRMED` and returns `200`. Retrying a confirmed hold returns the same representation. Other terminal-state transitions return `409`.
- `DELETE /holds/{hold_id}` changes `ACTIVE` to `CANCELLED` and returns an empty `204`. Deleting any non-`ACTIVE` hold returns `409`.

An `ACTIVE` or `CONFIRMED` hold occupies its seat, so a competing create returns `409`. Confirmation is permanent within this service. `CANCELLED` and `EXPIRED` release the seat. Expiry happens exactly when `expires_at <= current UTC time` and is materialized on read or mutation; no background worker is required. SQLite transactions and a partial unique index enforce the occupancy invariant under concurrent requests.

OpenAPI JSON is available at `/openapi.json` and interactive docs at `/docs`.

## Boundaries

This service intentionally excludes authentication, authorization, payments, a seat catalog, hold extension/list/admin endpoints, background expiry, retention cleanup, and distributed/multi-database operation. SQLite write transactions use a five-second busy timeout; production traffic beyond a single SQLite deployment needs a separate scaling decision.

See `HANDOFF.md` for exact install, test, build, and run commands.
