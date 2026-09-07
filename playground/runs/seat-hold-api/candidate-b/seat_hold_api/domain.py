from __future__ import annotations

import hashlib
import json
import sqlite3
import threading
import time
import uuid
from collections.abc import Callable
from contextlib import contextmanager
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterator, Literal

HoldStatus = Literal["active", "confirmed", "cancelled", "expired"]


class DomainError(Exception):
    code = "domain_error"
    status_code = 400


class HoldNotFound(DomainError):
    code = "hold_not_found"
    status_code = 404


class SeatUnavailable(DomainError):
    code = "seat_unavailable"
    status_code = 409


class InvalidTransition(DomainError):
    code = "invalid_transition"
    status_code = 409


class IdempotencyConflict(DomainError):
    code = "idempotency_conflict"
    status_code = 409


@dataclass(frozen=True)
class Hold:
    id: str
    seat_id: str
    customer_id: str
    status: HoldStatus
    created_at: float
    expires_at: float
    updated_at: float

    def as_dict(self) -> dict[str, str]:
        return {
            "id": self.id,
            "seat_id": self.seat_id,
            "customer_id": self.customer_id,
            "status": self.status,
            "created_at": _iso(self.created_at),
            "expires_at": _iso(self.expires_at),
            "updated_at": _iso(self.updated_at),
        }


def _iso(timestamp: float) -> str:
    return datetime.fromtimestamp(timestamp, timezone.utc).isoformat().replace("+00:00", "Z")


class SeatHoldStore:
    """SQLite store whose write operations are serialized by BEGIN IMMEDIATE."""

    def __init__(self, database_path: str | Path, clock: Callable[[], float] = time.time):
        self.database_path = str(database_path)
        self.clock = clock
        self._initialization_lock = threading.Lock()
        self._initialized = False

    def initialize(self) -> None:
        with self._initialization_lock:
            if self._initialized:
                return
            with self._connect() as connection:
                connection.executescript(
                    """
                    PRAGMA journal_mode=WAL;
                    CREATE TABLE IF NOT EXISTS holds (
                        id TEXT PRIMARY KEY,
                        seat_id TEXT NOT NULL,
                        customer_id TEXT NOT NULL,
                        status TEXT NOT NULL CHECK(status IN ('active','confirmed','cancelled','expired')),
                        created_at REAL NOT NULL,
                        expires_at REAL NOT NULL,
                        updated_at REAL NOT NULL,
                        idempotency_key TEXT NOT NULL UNIQUE,
                        request_fingerprint TEXT NOT NULL
                    );
                    CREATE UNIQUE INDEX IF NOT EXISTS one_consuming_hold_per_seat
                        ON holds(seat_id) WHERE status IN ('active', 'confirmed');
                    """
                )
            self._initialized = True

    def create(
        self,
        seat_id: str,
        customer_id: str,
        ttl_seconds: int,
        idempotency_key: str,
    ) -> tuple[Hold, bool]:
        fingerprint = hashlib.sha256(
            json.dumps(
                {
                    "customer_id": customer_id,
                    "seat_id": seat_id,
                    "ttl_seconds": ttl_seconds,
                },
                sort_keys=True,
                separators=(",", ":"),
            ).encode()
        ).hexdigest()
        now = self.clock()
        with self._write_transaction() as connection:
            self._expire_due(connection, now)
            prior = connection.execute(
                "SELECT * FROM holds WHERE idempotency_key = ?", (idempotency_key,)
            ).fetchone()
            if prior is not None:
                if prior["request_fingerprint"] != fingerprint:
                    raise IdempotencyConflict("Idempotency-Key was already used with a different request")
                return self._to_hold(prior), False

            consuming = connection.execute(
                """SELECT id FROM holds
                   WHERE seat_id = ? AND status IN ('active', 'confirmed')""",
                (seat_id,),
            ).fetchone()
            if consuming is not None:
                raise SeatUnavailable(f"seat {seat_id!r} is held or confirmed")

            hold_id = str(uuid.uuid4())
            expires_at = now + ttl_seconds
            try:
                connection.execute(
                    """INSERT INTO holds
                       (id, seat_id, customer_id, status, created_at, expires_at, updated_at,
                        idempotency_key, request_fingerprint)
                       VALUES (?, ?, ?, 'active', ?, ?, ?, ?, ?)""",
                    (
                        hold_id,
                        seat_id,
                        customer_id,
                        now,
                        expires_at,
                        now,
                        idempotency_key,
                        fingerprint,
                    ),
                )
            except sqlite3.IntegrityError as error:
                raise SeatUnavailable(f"seat {seat_id!r} is held or confirmed") from error
            return self._get_row(connection, hold_id), True

    def get(self, hold_id: str) -> Hold:
        now = self.clock()
        with self._write_transaction() as connection:
            self._expire_due(connection, now)
            return self._get_row(connection, hold_id)

    def confirm(self, hold_id: str) -> Hold:
        return self._transition(hold_id, target="confirmed")

    def cancel(self, hold_id: str) -> Hold:
        return self._transition(hold_id, target="cancelled")

    def _transition(self, hold_id: str, target: Literal["confirmed", "cancelled"]) -> Hold:
        now = self.clock()
        with self._write_transaction() as connection:
            self._expire_due(connection, now)
            current = self._get_row(connection, hold_id)
            if current.status == target:
                return current
            if current.status != "active":
                raise InvalidTransition(
                    f"cannot change hold from {current.status!r} to {target!r}"
                )
            connection.execute(
                "UPDATE holds SET status = ?, updated_at = ? WHERE id = ?",
                (target, now, hold_id),
            )
            return self._get_row(connection, hold_id)

    @contextmanager
    def _write_transaction(self) -> Iterator[sqlite3.Connection]:
        self.initialize()
        connection = self._connect()
        try:
            connection.execute("BEGIN IMMEDIATE")
            yield connection
            connection.commit()
        except Exception:
            connection.rollback()
            raise
        finally:
            connection.close()

    def _connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self.database_path, timeout=10, isolation_level=None)
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA busy_timeout=10000")
        connection.execute("PRAGMA foreign_keys=ON")
        return connection

    @staticmethod
    def _expire_due(connection: sqlite3.Connection, now: float) -> None:
        connection.execute(
            """UPDATE holds SET status = 'expired', updated_at = ?
               WHERE status = 'active' AND expires_at <= ?""",
            (now, now),
        )

    def _get_row(self, connection: sqlite3.Connection, hold_id: str) -> Hold:
        row = connection.execute("SELECT * FROM holds WHERE id = ?", (hold_id,)).fetchone()
        if row is None:
            raise HoldNotFound(f"hold {hold_id!r} does not exist")
        return self._to_hold(row)

    @staticmethod
    def _to_hold(row: sqlite3.Row) -> Hold:
        return Hold(
            id=row["id"],
            seat_id=row["seat_id"],
            customer_id=row["customer_id"],
            status=row["status"],
            created_at=row["created_at"],
            expires_at=row["expires_at"],
            updated_at=row["updated_at"],
        )
