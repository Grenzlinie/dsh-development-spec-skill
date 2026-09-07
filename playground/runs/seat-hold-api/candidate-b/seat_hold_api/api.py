from __future__ import annotations

import os
import time
from collections.abc import Callable
from pathlib import Path

from fastapi import FastAPI, Request, Response
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field, field_validator

from .domain import DomainError, Hold, SeatHoldStore


class CreateHoldRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    seat_id: str = Field(min_length=1, max_length=128)
    customer_id: str = Field(min_length=1, max_length=128)
    idempotency_key: str = Field(min_length=1, max_length=255)
    ttl_seconds: int = Field(default=120, ge=1, le=900)

    @field_validator("seat_id", "customer_id", "idempotency_key")
    @classmethod
    def value_must_not_be_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("value must not be blank")
        return value


class HoldResponse(BaseModel):
    id: str
    seat_id: str
    customer_id: str
    status: str
    created_at: str
    expires_at: str
    updated_at: str


def create_app(
    database_path: str | Path | None = None,
    clock: Callable[[], float] = time.time,
) -> FastAPI:
    path = database_path or os.getenv("SEAT_HOLD_DB", "seat_holds.db")
    store = SeatHoldStore(path, clock)

    app = FastAPI(
        title="Seat Hold API",
        version="0.1.0",
        description="Create, observe, confirm, and cancel temporary seat holds.",
    )
    app.state.store = store

    @app.exception_handler(DomainError)
    async def domain_error_handler(_request: Request, error: DomainError) -> JSONResponse:
        return JSONResponse(
            status_code=error.status_code,
            content={"error": {"code": error.code, "message": str(error)}},
        )

    @app.get("/health", tags=["operations"])
    def health() -> dict[str, str]:
        return {"status": "ok"}

    @app.post("/holds", response_model=HoldResponse, status_code=201, tags=["holds"])
    def create_hold(body: CreateHoldRequest) -> dict[str, str]:
        hold, _created = store.create(
            body.seat_id,
            body.customer_id,
            body.ttl_seconds,
            body.idempotency_key,
        )
        return _response(hold)

    @app.get("/holds/{hold_id}", response_model=HoldResponse, tags=["holds"])
    def get_hold(hold_id: str) -> dict[str, str]:
        return _response(store.get(hold_id))

    @app.post("/holds/{hold_id}/confirm", response_model=HoldResponse, tags=["holds"])
    def confirm_hold(hold_id: str) -> dict[str, str]:
        return _response(store.confirm(hold_id))

    @app.delete("/holds/{hold_id}", status_code=204, tags=["holds"])
    def cancel_hold(hold_id: str) -> Response:
        store.cancel(hold_id)
        return Response(status_code=204)

    return app


def _response(hold: Hold) -> dict[str, str]:
    return hold.as_dict()


app = create_app()
