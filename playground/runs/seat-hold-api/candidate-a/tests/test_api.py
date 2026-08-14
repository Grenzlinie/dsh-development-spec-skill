from __future__ import annotations

from datetime import timedelta
from pathlib import Path

from fastapi.testclient import TestClient

from seat_hold_api.app import create_app
from tests.conftest import MutableClock


def create_payload(**overrides: object) -> dict[str, object]:
    payload: dict[str, object] = {
        "seat_id": "A-1",
        "customer_id": "customer-1",
        "idempotency_key": "request-1",
    }
    payload.update(overrides)
    return payload


def test_create_get_and_exact_replay_do_not_extend_expiry(client: TestClient, clock) -> None:
    created = client.post("/holds", json=create_payload())
    assert created.status_code == 201
    body = created.json()
    assert body == {
        "id": body["id"],
        "seat_id": "A-1",
        "customer_id": "customer-1",
        "state": "ACTIVE",
        "created_at": "2030-01-01T00:00:00Z",
        "expires_at": "2030-01-01T00:02:00Z",
    }

    clock.current += timedelta(seconds=30)
    replay = client.post("/holds", json=create_payload())
    assert replay.status_code == 200
    assert replay.json() == body

    fetched = client.get(f"/holds/{body['id']}")
    assert fetched.status_code == 200
    assert fetched.json() == body


def test_explicit_ttl_boundary_releases_seat(client: TestClient, clock) -> None:
    created = client.post("/holds", json=create_payload(ttl_seconds=1)).json()
    clock.current += timedelta(seconds=1)

    expired = client.get(f"/holds/{created['id']}")
    assert expired.status_code == 200
    assert expired.json()["state"] == "EXPIRED"

    replacement = client.post(
        "/holds",
        json=create_payload(customer_id="customer-2", idempotency_key="request-2"),
    )
    assert replacement.status_code == 201
    assert replacement.json()["state"] == "ACTIVE"


def test_idempotency_conflict_and_active_seat_conflict(client: TestClient) -> None:
    assert client.post("/holds", json=create_payload()).status_code == 201
    for changed in (
        create_payload(customer_id="other"),
        create_payload(seat_id="other-seat"),
        create_payload(ttl_seconds=121),
    ):
        assert client.post("/holds", json=changed).status_code == 409

    occupied = client.post(
        "/holds",
        json=create_payload(customer_id="other", idempotency_key="other-key"),
    )
    assert occupied.status_code == 409

    independent = client.post(
        "/holds", json=create_payload(seat_id="B-1", idempotency_key="b-key")
    )
    assert independent.status_code == 201


def test_confirm_is_retry_safe_and_confirmed_permanently_occupies(
    client: TestClient, clock
) -> None:
    hold = client.post("/holds", json=create_payload(ttl_seconds=1)).json()
    first = client.post(f"/holds/{hold['id']}/confirm")
    second = client.post(f"/holds/{hold['id']}/confirm")
    assert first.status_code == second.status_code == 200
    assert first.json() == second.json()
    assert first.json()["state"] == "CONFIRMED"

    clock.current += timedelta(days=10)
    assert client.get(f"/holds/{hold['id']}").json()["state"] == "CONFIRMED"
    conflict = client.post(
        "/holds",
        json=create_payload(customer_id="other", idempotency_key="other-key"),
    )
    assert conflict.status_code == 409


def test_cancel_returns_204_once_and_releases_seat(client: TestClient) -> None:
    hold = client.post("/holds", json=create_payload()).json()
    first = client.delete(f"/holds/{hold['id']}")
    assert first.status_code == 204
    assert first.content == b""
    assert client.get(f"/holds/{hold['id']}").json()["state"] == "CANCELLED"
    assert client.delete(f"/holds/{hold['id']}").status_code == 409

    replacement = client.post(
        "/holds",
        json=create_payload(customer_id="other", idempotency_key="other-key"),
    )
    assert replacement.status_code == 201


def test_invalid_transitions_and_missing_holds_are_explicit(client: TestClient, clock) -> None:
    assert client.get("/holds/missing").status_code == 404
    assert client.post("/holds/missing/confirm").status_code == 404
    assert client.delete("/holds/missing").status_code == 404

    cancelled = client.post("/holds", json=create_payload()).json()
    assert client.delete(f"/holds/{cancelled['id']}").status_code == 204
    assert client.post(f"/holds/{cancelled['id']}/confirm").status_code == 409

    expired = client.post(
        "/holds",
        json=create_payload(seat_id="B-1", idempotency_key="request-2", ttl_seconds=1),
    ).json()
    clock.current += timedelta(seconds=1)
    assert client.post(f"/holds/{expired['id']}/confirm").status_code == 409
    assert client.delete(f"/holds/{expired['id']}").status_code == 409


def test_validation_and_openapi_contract(client: TestClient) -> None:
    upper_boundary = client.post(
        "/holds", json=create_payload(seat_id="TTL-900", idempotency_key="ttl-900", ttl_seconds=900)
    )
    assert upper_boundary.status_code == 201

    for payload in (
        create_payload(seat_id=" "),
        create_payload(customer_id=""),
        create_payload(idempotency_key=""),
        create_payload(ttl_seconds=0),
        create_payload(ttl_seconds=901),
        create_payload(unexpected=True),
    ):
        assert client.post("/holds", json=payload).status_code == 422

    document = client.get("/openapi.json").json()
    assert set(document["paths"]) >= {
        "/holds",
        "/holds/{hold_id}",
        "/holds/{hold_id}/confirm",
    }
    assert set(document["paths"]["/holds"]["post"]["responses"]) >= {"200", "201", "409"}
    assert set(document["paths"]["/holds/{hold_id}"]) == {"get", "delete"}
    assert set(document["paths"]["/holds/{hold_id}"]["delete"]["responses"]) >= {
        "204",
        "404",
        "409",
    }
    assert document["components"]["schemas"]["HoldResponse"]["properties"]["state"][
        "enum"
    ] == ["ACTIVE", "CONFIRMED", "CANCELLED", "EXPIRED"]


def test_holds_and_idempotency_survive_restart(
    database_path: Path, clock: MutableClock
) -> None:
    with TestClient(create_app(database_path=database_path, clock=clock)) as first_client:
        original = first_client.post("/holds", json=create_payload()).json()

    with TestClient(create_app(database_path=database_path, clock=clock)) as restarted_client:
        fetched = restarted_client.get(f"/holds/{original['id']}")
        replay = restarted_client.post("/holds", json=create_payload())
        assert fetched.status_code == 200
        assert fetched.json() == original
        assert replay.status_code == 200
        assert replay.json() == original
        conflict = restarted_client.post("/holds", json=create_payload(customer_id="changed"))
        assert conflict.status_code == 409
