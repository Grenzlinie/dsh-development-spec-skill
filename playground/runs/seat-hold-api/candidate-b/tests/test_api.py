from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor

from fastapi.testclient import TestClient

from seat_hold_api.api import create_app

from .conftest import ManualClock


def create_hold(
    client: TestClient,
    seat: str,
    key: str,
    ttl: int | None = 60,
    customer: str = "customer-1",
):
    body = {
        "seat_id": seat,
        "customer_id": customer,
        "idempotency_key": key,
    }
    if ttl is not None:
        body["ttl_seconds"] = ttl
    return client.post(
        "/holds",
        json=body,
    )


def test_create_get_confirm_and_idempotent_confirm(client: TestClient):
    created = create_hold(client, "A-10", "checkout-1")
    assert created.status_code == 201
    hold = created.json()
    assert hold["status"] == "active"
    assert hold["customer_id"] == "customer-1"
    assert client.get(f"/holds/{hold['id']}").json() == hold

    confirmed = client.post(f"/holds/{hold['id']}/confirm")
    retried = client.post(f"/holds/{hold['id']}/confirm")
    assert confirmed.status_code == 200
    assert confirmed.json()["status"] == "confirmed"
    assert retried.json() == confirmed.json()


def test_create_retry_returns_same_hold_and_changed_payload_conflicts(client: TestClient):
    first = create_hold(client, "B-2", "checkout-2", ttl=30)
    retry = create_hold(client, "B-2", "checkout-2", ttl=30)
    conflict = create_hold(client, "B-3", "checkout-2", ttl=30, customer="customer-2")

    assert retry.status_code == 201
    assert retry.json() == first.json()
    assert conflict.status_code == 409
    assert conflict.json()["error"]["code"] == "idempotency_conflict"


def test_cancel_is_idempotent_and_releases_seat(client: TestClient):
    hold = create_hold(client, "C-4", "checkout-3").json()
    cancelled = client.delete(f"/holds/{hold['id']}")
    retried = client.delete(f"/holds/{hold['id']}")
    replacement = create_hold(client, "C-4", "checkout-4")

    assert cancelled.status_code == 204
    assert cancelled.content == b""
    assert retried.status_code == 204
    assert client.get(f"/holds/{hold['id']}").json()["status"] == "cancelled"
    assert replacement.status_code == 201
    assert replacement.json()["id"] != hold["id"]


def test_expiry_is_observed_and_releases_seat(client: TestClient, clock: ManualClock):
    original = create_hold(client, "D-1", "checkout-5", ttl=5).json()
    clock.advance(5)

    observed = client.get(f"/holds/{original['id']}")
    replacement = create_hold(client, "D-1", "checkout-6", ttl=5)

    assert observed.json()["status"] == "expired"
    assert replacement.status_code == 201
    assert client.post(f"/holds/{original['id']}/confirm").status_code == 409


def test_active_and_confirmed_hold_block_second_client(client: TestClient, clock: ManualClock):
    assert create_hold(client, "E-9", "checkout-7").status_code == 201
    response = create_hold(client, "E-9", "checkout-8")
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "seat_unavailable"

    confirmed_source = create_hold(client, "E-10", "checkout-9", ttl=1).json()
    assert client.post(f"/holds/{confirmed_source['id']}/confirm").status_code == 200
    clock.advance(2)
    confirmed_conflict = create_hold(client, "E-10", "checkout-10")
    assert confirmed_conflict.status_code == 409
    assert client.get(f"/holds/{confirmed_source['id']}").json()["status"] == "confirmed"


def test_concurrent_attempts_create_exactly_one_active_hold(tmp_path):
    app = create_app(tmp_path / "concurrent.db", ManualClock())
    with TestClient(app) as client:
        def attempt(number: int):
            return create_hold(client, "F-12", f"parallel-{number}")

        with ThreadPoolExecutor(max_workers=8) as pool:
            responses = list(pool.map(attempt, range(8)))

        assert [response.status_code for response in responses].count(201) == 1
        assert [response.status_code for response in responses].count(409) == 7


def test_validation_and_missing_hold(client: TestClient):
    missing_fields = client.post("/holds", json={"seat_id": "A-1", "ttl_seconds": 10})
    blank_seat = create_hold(client, "   ", "bad-seat")
    too_long = create_hold(client, "A-2", "too-long", ttl=901)
    missing_hold = client.get("/holds/not-found")

    assert missing_fields.status_code == 422
    assert blank_seat.status_code == 422
    assert too_long.status_code == 422
    assert missing_hold.status_code == 404


def test_ttl_defaults_to_120_seconds(client: TestClient, clock: ManualClock):
    hold = create_hold(client, "G-1", "checkout-default", ttl=None).json()
    assert hold["created_at"] == "2023-11-14T22:13:20Z"
    assert hold["expires_at"] == "2023-11-14T22:15:20Z"


def test_hold_and_idempotency_survive_application_restart(tmp_path):
    database = tmp_path / "restart.db"
    clock = ManualClock()
    request = {
        "seat_id": "H-8",
        "customer_id": "customer-restart",
        "idempotency_key": "checkout-restart",
        "ttl_seconds": 90,
    }

    with TestClient(create_app(database, clock)) as first_client:
        original = first_client.post("/holds", json=request)
        assert original.status_code == 201

    with TestClient(create_app(database, clock)) as restarted_client:
        observed = restarted_client.get(f"/holds/{original.json()['id']}")
        replayed = restarted_client.post("/holds", json=request)
        conflict = restarted_client.post(
            "/holds", json={**request, "customer_id": "different-customer"}
        )

    assert observed.json() == original.json()
    assert replayed.status_code == 201
    assert replayed.json() == original.json()
    assert conflict.status_code == 409
    assert conflict.json()["error"]["code"] == "idempotency_conflict"


def test_openapi_publishes_locked_create_and_cancel_contract(client: TestClient):
    schema = client.get("/openapi.json").json()
    create_schema = schema["components"]["schemas"]["CreateHoldRequest"]

    assert set(create_schema["required"]) == {"seat_id", "customer_id", "idempotency_key"}
    assert create_schema["properties"]["ttl_seconds"] == {
        "type": "integer",
        "maximum": 900.0,
        "minimum": 1.0,
        "title": "Ttl Seconds",
        "default": 120,
    }
    assert "parameters" not in schema["paths"]["/holds"]["post"]
    assert set(schema["paths"]["/holds/{hold_id}"]["delete"]["responses"]) == {
        "204",
        "422",
    }
