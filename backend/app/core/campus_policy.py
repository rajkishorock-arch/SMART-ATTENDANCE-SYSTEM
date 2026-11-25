from fastapi import Depends, HTTPException
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from starlette.requests import HTTPConnection

from app.core import config
from app.database import get_db
from app.models.settings import CampusSecurityPolicy


def check_campus_access(connection: HTTPConnection, db: Session = Depends(get_db)):
    path = connection.url.path.rstrip("/")
    if path.endswith(("/settings/campus-policy", "/auth/me")):
        return
    scheme, _, token = connection.headers.get("authorization", "").partition(" ")
    if scheme.lower() != "bearer":
        return
    try:
        claims = jwt.decode(token, config.JWT_SECRET_KEY, algorithms=[config.ALGORITHM])
    except JWTError:
        return  # The endpoint handles invalid credentials.
    policy = db.get(CampusSecurityPolicy, claims.get("institution_id") or 1)
    if policy and policy.locked:
        raise HTTPException(423, "Your institution has paused access. Contact your administrator.")
