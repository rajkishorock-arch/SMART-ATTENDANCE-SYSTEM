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


@router.post("/challenge")
def start_liveness_challenge(
    identity: security.AuthIdentity = Depends(security.get_current_identity),
):
    return create_liveness_challenge(identity.email)


@router.post("/step")
def report_step(
    payload: LivenessStepReport,
    identity: security.AuthIdentity = Depends(security.get_current_identity),
):
    return report_liveness_step(payload.challenge_id, payload.step, payload.ear_value)

