from __future__ import annotations

import threading

import pytest
from fastapi.testclient import TestClient

from seat_hold_api.api import create_app


class ManualClock:
    def __init__(self, now: float = 1_700_000_000.0):
        self._now = now
        self._lock = threading.Lock()

    def __call__(self) -> float:
        with self._lock:
            return self._now

    def advance(self, seconds: float) -> None:
        with self._lock:
            self._now += seconds


@pytest.fixture
def clock() -> ManualClock:
    return ManualClock()


@pytest.fixture
def client(tmp_path, clock: ManualClock) -> TestClient:
    with TestClient(create_app(tmp_path / "test.db", clock)) as test_client:
        yield test_client

