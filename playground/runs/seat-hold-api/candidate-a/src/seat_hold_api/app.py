from __future__ import annotations

import os
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from datetime import datetime
from pathlib import Path
from typing import Annotated, Literal

from fastapi import FastAPI, HTTPException, Response, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field, StringConstraints

from seat_hold_api.domain import Clock, Hold, SystemClock
from seat_hold_api.repository import (
    HoldConflictError,
    HoldNotFoundError,
    HoldRepository,
)

NonBlank = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]


class CreateHoldRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    seat_id: NonBlank
    customer_id: NonBlank
    idempotency_key: NonBlank
    ttl_seconds: int = Field(default=120, ge=1, le=900)


class HoldResponse(BaseModel):
    id: str
    seat_id: str
    customer_id: str
    state: Literal["ACTIVE", "CONFIRMED", "CANCELLED", "EXPIRED"]
    created_at: datetime
    expires_at: datetime

    @classmethod
    def from_domain(cls, hold: Hold) -> HoldResponse:
        return cls(
            id=hold.id,
            seat_id=hold.seat_id,
            customer_id=hold.customer_id,
            state=hold.state.value,
            created_at=hold.created_at,
            expires_at=hold.expires_at,
        )


def create_app(
    *,
    database_path: str | Path | None = None,
    clock: Clock | None = None,
) -> FastAPI:
    resolved_path = database_path or os.getenv("SEAT_HOLD_DB", "seat_holds.db")
    repository = HoldRepository(resolved_path, clock or SystemClock())

    @asynccontextmanager
    async def lifespan(_: FastAPI) -> AsyncIterator[None]:
        repository.initialize()
        yield

    application = FastAPI(
        title="Seat Hold API",
        version="0.1.0",
        description="Exclusive, expiring SQLite-backed seat holds.",
        lifespan=lifespan,
    )

    @application.post(
        "/holds",
        response_model=HoldResponse,
        status_code=status.HTTP_201_CREATED,
        responses={
            200: {"model": HoldResponse, "description": "Exact idempotent replay"},
            409: {"description": "Seat or idempotency-key conflict"},
        },
    )
    def create_hold(request: CreateHoldRequest) -> HoldResponse | JSONResponse:
        try:
            hold, replayed = repository.create(
                seat_id=request.seat_id,
                customer_id=request.customer_id,
                idempotency_key=request.idempotency_key,
                ttl_seconds=request.ttl_seconds,
            )
        except HoldConflictError as error:
            raise HTTPException(status_code=409, detail=str(error)) from error
        response = HoldResponse.from_domain(hold)
        if replayed:
            return JSONResponse(status_code=200, content=response.model_dump(mode="json"))
        return response

    @application.get(
        "/holds/{hold_id}",
        response_model=HoldResponse,
        responses={404: {"description": "Hold not found"}},
    )
    def get_hold(hold_id: str) -> HoldResponse:
        try:
            return HoldResponse.from_domain(repository.get(hold_id))
        except HoldNotFoundError as error:
            raise HTTPException(status_code=404, detail=str(error)) from error

    @application.post(
        "/holds/{hold_id}/confirm",
        response_model=HoldResponse,
        responses={
            404: {"description": "Hold not found"},
            409: {"description": "Invalid state transition"},
        },
    )
    def confirm_hold(hold_id: str) -> HoldResponse:
        try:
            return HoldResponse.from_domain(repository.confirm(hold_id))
        except HoldNotFoundError as error:
            raise HTTPException(status_code=404, detail=str(error)) from error
        except HoldConflictError as error:
            raise HTTPException(status_code=409, detail=str(error)) from error

    @application.delete(
        "/holds/{hold_id}",
        status_code=status.HTTP_204_NO_CONTENT,
        responses={
            404: {"description": "Hold not found"},
            409: {"description": "Invalid state transition"},
        },
    )
    def cancel_hold(hold_id: str) -> Response:
        try:
            repository.cancel(hold_id)
        except HoldNotFoundError as error:
            raise HTTPException(status_code=404, detail=str(error)) from error
        except HoldConflictError as error:
            raise HTTPException(status_code=409, detail=str(error)) from error
        return Response(status_code=status.HTTP_204_NO_CONTENT)

    return application


app = create_app()
