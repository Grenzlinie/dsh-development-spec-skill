from __future__ import annotations

import sqlite3
from collections.abc import Iterator
from contextlib import contextmanager
from datetime import datetime, timedelta
from pathlib import Path
from uuid import uuid4

from seat_hold_api.domain import (
    Clock,
    Hold,
    HoldState,
    as_utc,
    format_timestamp,
    parse_timestamp,
)


class HoldNotFoundError(Exception):
    pass


class HoldConflictError(Exception):
    pass


class IdempotencyConflictError(HoldConflictError):
    pass


class SeatUnavailableError(HoldConflictError):
    pass


class InvalidTransitionError(HoldConflictError):
    pass


class HoldRepository:
    def __init__(self, database_path: str | Path, clock: Clock) -> None:
        self._database_path = str(database_path)
        self._clock = clock

    def initialize(self) -> None:
        with self._connect() as connection:
            connection.execute("PRAGMA journal_mode = WAL")
            connection.executescript(
                """
                CREATE TABLE IF NOT EXISTS holds (
                    id TEXT PRIMARY KEY,
                    seat_id TEXT NOT NULL,
                    customer_id TEXT NOT NULL,
                    idempotency_key TEXT NOT NULL UNIQUE,
                    ttl_seconds INTEGER NOT NULL CHECK (ttl_seconds BETWEEN 1 AND 900),
                    state TEXT NOT NULL CHECK (
                        state IN ('ACTIVE', 'CONFIRMED', 'CANCELLED', 'EXPIRED')
                    ),
                    created_at TEXT NOT NULL,
                    expires_at TEXT NOT NULL
                );

                CREATE UNIQUE INDEX IF NOT EXISTS one_occupying_hold_per_seat
                    ON holds (seat_id)
                    WHERE state IN ('ACTIVE', 'CONFIRMED');
                """
            )

    def create(
        self,
        *,
        seat_id: str,
        customer_id: str,
        idempotency_key: str,
        ttl_seconds: int,
    ) -> tuple[Hold, bool]:
        now = as_utc(self._clock.now())
        with self._write_transaction() as connection:
            self._expire_due(connection, now=now, seat_id=seat_id)
            existing = self._find_by_key(connection, idempotency_key)
            if existing is not None:
                if (
                    existing.seat_id,
                    existing.customer_id,
                    existing.ttl_seconds,
                ) != (seat_id, customer_id, ttl_seconds):
                    raise IdempotencyConflictError(
                        "idempotency_key is already associated with a different request"
                    )
                return existing, True

            occupying = connection.execute(
                """
                SELECT id FROM holds
                WHERE seat_id = ? AND state IN ('ACTIVE', 'CONFIRMED')
                LIMIT 1
                """,
                (seat_id,),
            ).fetchone()
            if occupying is not None:
                raise SeatUnavailableError("seat already has an active or confirmed hold")

            hold_id = str(uuid4())
            expires_at = now + timedelta(seconds=ttl_seconds)
            try:
                connection.execute(
                    """
                    INSERT INTO holds (
                        id, seat_id, customer_id, idempotency_key, ttl_seconds,
                        state, created_at, expires_at
                    ) VALUES (?, ?, ?, ?, ?, 'ACTIVE', ?, ?)
                    """,
                    (
                        hold_id,
                        seat_id,
                        customer_id,
                        idempotency_key,
                        ttl_seconds,
                        format_timestamp(now),
                        format_timestamp(expires_at),
                    ),
                )
            except sqlite3.IntegrityError as error:
                if "holds.idempotency_key" in str(error):
                    raise IdempotencyConflictError(
                        "idempotency_key is already associated with a request"
                    ) from error
                if "holds.seat_id" in str(error):
                    raise SeatUnavailableError(
                        "seat already has an active or confirmed hold"
                    ) from error
                raise

            return self._get_required(connection, hold_id), False

    def get(self, hold_id: str) -> Hold:
        now = as_utc(self._clock.now())
        with self._write_transaction() as connection:
            self._expire_due(connection, now=now, hold_id=hold_id)
            return self._get_required(connection, hold_id)

    def confirm(self, hold_id: str) -> Hold:
        now = as_utc(self._clock.now())
        with self._write_transaction() as connection:
            self._expire_due(connection, now=now, hold_id=hold_id)
            hold = self._get_required(connection, hold_id)
            if hold.state is HoldState.CONFIRMED:
                return hold
            if hold.state is not HoldState.ACTIVE:
                raise InvalidTransitionError(f"cannot confirm a {hold.state} hold")
            connection.execute(
                "UPDATE holds SET state = 'CONFIRMED' WHERE id = ? AND state = 'ACTIVE'",
                (hold_id,),
            )
            return self._get_required(connection, hold_id)

    def cancel(self, hold_id: str) -> None:
        now = as_utc(self._clock.now())
        with self._write_transaction() as connection:
            self._expire_due(connection, now=now, hold_id=hold_id)
            hold = self._get_required(connection, hold_id)
            if hold.state is not HoldState.ACTIVE:
                raise InvalidTransitionError(f"cannot cancel a {hold.state} hold")
            connection.execute(
                "UPDATE holds SET state = 'CANCELLED' WHERE id = ? AND state = 'ACTIVE'",
                (hold_id,),
            )

    @contextmanager
    def _connect(self) -> Iterator[sqlite3.Connection]:
        connection = sqlite3.connect(self._database_path, timeout=5.0)
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA busy_timeout = 5000")
        try:
            yield connection
            connection.commit()
        finally:
            connection.close()

    @contextmanager
    def _write_transaction(self) -> Iterator[sqlite3.Connection]:
        with self._connect() as connection:
            connection.execute("BEGIN IMMEDIATE")
            try:
                yield connection
            except Exception:
                connection.rollback()
                raise

    @staticmethod
    def _expire_due(
        connection: sqlite3.Connection,
        *,
        now: datetime,
        seat_id: str | None = None,
        hold_id: str | None = None,
    ) -> None:
        clauses = ["state = 'ACTIVE'", "expires_at <= ?"]
        parameters: list[object] = [format_timestamp(now)]
        if seat_id is not None:
            clauses.append("seat_id = ?")
            parameters.append(seat_id)
        if hold_id is not None:
            clauses.append("id = ?")
            parameters.append(hold_id)
        connection.execute(
            f"UPDATE holds SET state = 'EXPIRED' WHERE {' AND '.join(clauses)}",
            parameters,
        )

    @staticmethod
    def _find_by_key(
        connection: sqlite3.Connection, idempotency_key: str
    ) -> Hold | None:
        row = connection.execute(
            "SELECT * FROM holds WHERE idempotency_key = ?", (idempotency_key,)
        ).fetchone()
        return None if row is None else HoldRepository._from_row(row)

    @staticmethod
    def _get_required(connection: sqlite3.Connection, hold_id: str) -> Hold:
        row = connection.execute("SELECT * FROM holds WHERE id = ?", (hold_id,)).fetchone()
        if row is None:
            raise HoldNotFoundError("hold not found")
        return HoldRepository._from_row(row)

    @staticmethod
    def _from_row(row: sqlite3.Row) -> Hold:
        return Hold(
            id=row["id"],
            seat_id=row["seat_id"],
            customer_id=row["customer_id"],
            idempotency_key=row["idempotency_key"],
            ttl_seconds=row["ttl_seconds"],
            state=HoldState(row["state"]),
            created_at=parse_timestamp(row["created_at"]),
            expires_at=parse_timestamp(row["expires_at"]),
        )
