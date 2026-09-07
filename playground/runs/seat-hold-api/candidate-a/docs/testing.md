# Testing

`tests/test_api.py` is the HTTP integration suite. It starts the assembled FastAPI app against temporary SQLite databases and covers create/read, TTL bounds and exact expiry, create idempotency, restart persistence, confirm/cancel transitions, released and permanently occupied seats, errors, and OpenAPI surface.

`tests/test_concurrency.py` synchronizes two threads that create different holds for the same seat. Its oracle is exactly one `201`, one `409`, and one observable `ACTIVE` winner. This exercises the actual HTTP, repository transaction, and database uniqueness path.

Run the focused and aggregate commands listed in `HANDOFF.md`. Ruff is static evidence, package build is distribution evidence, and `specctl verify --require-note` is governance consistency evidence; none substitutes for the HTTP/concurrency tests.
