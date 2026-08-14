# Development

Use Python 3.11 or newer and the committed `uv.lock`. Run `UV_CACHE_DIR=/tmp/seat-hold-api-uv-cache uv sync --frozen --all-groups` for a reproducible local environment. Production behavior changes follow the repository's `DISCOVER -> FRAME -> SPECIFY -> APPROVE -> IMPLEMENT -> VERIFY -> REVIEW -> RECORD` lifecycle and require an approved Agent Note.

Keep the public contract in FastAPI models/routes and explain it in `README.md`. Keep state and concurrency invariants in the repository rather than duplicating them in route handlers. New behavior needs deterministic tests using a temporary real SQLite file and the injected clock. Never use wall-clock sleeps for expiry tests.

Do not retain `.venv`, caches, coverage, `dist`, `build`, egg metadata, or runtime SQLite databases in a delivered candidate.
