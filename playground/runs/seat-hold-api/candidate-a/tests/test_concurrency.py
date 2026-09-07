from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
from threading import Barrier

import pytest
from fastapi.testclient import TestClient


@pytest.mark.parametrize("race", range(5))
def test_concurrent_create_allows_only_one_active_hold(
    client: TestClient, race: int
) -> None:
    barrier = Barrier(2)

    def attempt(index: int) -> tuple[int, dict[str, object]]:
        barrier.wait()
        response = client.post(
            "/holds",
            json={
                "seat_id": f"RACE-{race}",
                "customer_id": f"customer-{index}",
                "idempotency_key": f"race-{race}-key-{index}",
            },
        )
        return response.status_code, response.json()

    with ThreadPoolExecutor(max_workers=2) as executor:
        results = list(executor.map(attempt, (1, 2)))

    assert sorted(status for status, _ in results) == [201, 409]
    winners = [body for status, body in results if status == 201]
    assert len(winners) == 1
    assert winners[0]["state"] == "ACTIVE"
    assert client.get(f"/holds/{winners[0]['id']}").json()["state"] == "ACTIVE"
