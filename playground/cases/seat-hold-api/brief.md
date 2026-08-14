# Seat Hold API

Build a FastAPI service backed by SQLite for temporarily holding a seat during checkout. Clients must be able to create a hold, confirm it, cancel it, and observe expiry. Retries must be safe, and concurrent attempts must never produce two active holds for the same seat. Provide a clear HTTP contract, deterministic tests with controllable time, and a reproducible local run/verify handoff.

The product owner can answer product questions. Choose reversible implementation details yourself. Deliver source, dependency lock, tests, and docs; do not include a virtual environment, cache, or runtime database.
