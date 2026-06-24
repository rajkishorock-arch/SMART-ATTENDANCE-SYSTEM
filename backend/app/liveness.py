from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional

from . import security, models
from .liveness_service import create_liveness_challenge, report_liveness_step

router = APIRouter()


class LivenessStepReport(BaseModel):
    challenge_id: str
    step: str
    ear_value: float = 0.25
    client_timestamp_ms: Optional[int] = None


@router.post("/challenge")
def start_liveness_challenge(
    current_user: models.User = Depends(security.get_current_user),
):
    return create_liveness_challenge(current_user.email)


@router.post("/step")
def report_step(
    payload: LivenessStepReport,
    current_user: models.User = Depends(security.get_current_user),
):
    return report_liveness_step(payload.challenge_id, payload.step, payload.ear_value)
