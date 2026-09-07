# HTTP contract

All request and response bodies are JSON. The interactive OpenAPI UI is served at
`/docs`, with the machine-readable schema at `/openapi.json`. Timestamps are UTC
RFC 3339 strings.

## Create a hold

`POST /holds` accepts this body:

```json
{
  "seat_id": "A-10",
  "customer_id": "customer-42",
  "idempotency_key": "checkout-7-attempt-1",
  "ttl_seconds": 120
}
```

`seat_id`, `customer_id`, and `idempotency_key` are required non-blank strings.
`ttl_seconds` is an integer from 1 through 900 and defaults to 120 when omitted.
Seat and customer identifiers are opaque and case-sensitive. Success is `201`
with a hold representation. Repeating an `idempotency_key` with the identical
body returns the same persisted hold (also `201`), including after a process
restart. Reusing the key with different input is `409 idempotency_conflict`.
A different key for a seat with an active or confirmed hold is
`409 seat_unavailable`.

## Read and mutate a hold

- `GET /holds/{hold_id}` returns the current representation or `404 hold_not_found`.
- `POST /holds/{hold_id}/confirm` changes `active` to `confirmed`.
- `DELETE /holds/{hold_id}` changes `active` to `cancelled` and returns `204`
  with an empty body.

Confirm and cancel take no request body. Repeating confirmation returns the same
representation with `200`; repeating cancellation returns `204`. Trying a
different transition after a terminal state returns `409 invalid_transition`.
`confirmed`, `cancelled`, and `expired` are terminal states. Confirmation
permanently consumes the seat: a confirmed hold does not expire or release it.

Expiry is lazy but transactionally consistent: every hold read, create, confirm,
or cancel first changes all due active holds to `expired`. A hold is due when the
current time is greater than or equal to `expires_at`. This makes the released
seat immediately available to that operation without needing a background worker.

## Hold representation

```json
{
  "id": "d2ecaebd-896d-4866-95ca-d1cb86762cc8",
  "seat_id": "A-10",
  "customer_id": "customer-42",
  "status": "active",
  "created_at": "2023-11-14T22:13:20Z",
  "expires_at": "2023-11-14T22:18:20Z",
  "updated_at": "2023-11-14T22:13:20Z"
}
```

Domain errors use `{"error":{"code":"...","message":"..."}}`. Framework input
validation errors use FastAPI's standard `422` response. `GET /health` returns
`{"status":"ok"}`.
