import os

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlmodel import Session, select

from ..auth import get_current_user
from ..db import get_session
from ..models import PushSubscription, User
from ..services.notifications import sprawdz_terminy

router = APIRouter(prefix="/api/push", tags=["push"])


class SubskrybujRequest(BaseModel):
    endpoint: str
    p256dh: str
    auth: str


@router.get("/vapid-public-key")
def vapid_public_key():
    return {"key": os.getenv("VAPID_PUBLIC_KEY", "")}


@router.post("/subskrybuj", status_code=201)
def subskrybuj(
    dane: SubskrybujRequest,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    istniejaca = session.exec(
        select(PushSubscription).where(PushSubscription.endpoint == dane.endpoint)
    ).first()
    if istniejaca:
        return {"status": "juz_subskrybowany"}

    sub = PushSubscription(
        user_id=current_user.id,
        endpoint=dane.endpoint,
        p256dh=dane.p256dh,
        auth=dane.auth,
    )
    session.add(sub)
    session.commit()
    return {"status": "ok"}


@router.post("/odsubskrybuj", status_code=204)
def odsubskrybuj(
    dane: SubskrybujRequest,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    sub = session.exec(
        select(PushSubscription).where(
            PushSubscription.endpoint == dane.endpoint,
            PushSubscription.user_id == current_user.id,
        )
    ).first()
    if sub:
        session.delete(sub)
        session.commit()


@router.post("/test", status_code=200)
def trigger_test(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Ręczne wywołanie joba - do testowania podczas devu."""
    n = sprawdz_terminy(session)
    return {"status": "ok", "wyslano_alertow": n}
