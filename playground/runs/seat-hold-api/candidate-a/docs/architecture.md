# Architecture

The application factory in `src/seat_hold_api/app.py` owns the FastAPI HTTP boundary and maps domain errors to documented HTTP statuses. Request and response models are the authoritative wire schemas.

`src/seat_hold_api/repository.py` owns SQLite persistence and state transitions. Each mutation uses a fresh connection and `BEGIN IMMEDIATE`, first materializing relevant expiry and then evaluating or changing state in one transaction. A partial unique index across `ACTIVE` and `CONFIRMED` rows is the final concurrency guard for one occupying hold per seat. The idempotency key and normalized request fields live with the hold, so replay semantics survive process restarts.

`src/seat_hold_api/domain.py` defines hold state, UTC timestamp conversion, and the `Clock` protocol. Production uses `SystemClock`; tests inject a mutable UTC clock. Expiry is lazy and exact at `expires_at <= now`. Confirmed holds never expire in this service.

The dependency direction is `app -> repository -> domain`. SQLite is the only durable component. The service does not include background work or distributed coordination.
