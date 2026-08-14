from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from seat_hold_api.app import create_app


@dataclass
class MutableClock:
    current: datetime

    def now(self) -> datetime:
        return self.current


@pytest.fixture
def clock() -> MutableClock:
    return MutableClock(datetime(2030, 1, 1, tzinfo=UTC))


@pytest.fixture
def database_path(tmp_path: Path) -> Path:
    return tmp_path / "holds.sqlite3"


@pytest.fixture
def client(database_path: Path, clock: MutableClock):
    with TestClient(create_app(database_path=database_path, clock=clock)) as test_client:
        yield test_client
