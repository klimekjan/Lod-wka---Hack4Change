from typing import List

from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from ..db import get_session
from ..models import Notification, User
from ..auth import get_current_user
from ..schemas import NotificationResponse

router = APIRouter(prefix="/api/powiadomienia", tags=["powiadomienia"])


@router.get("", response_model=List[NotificationResponse])
def lista_powiadomien(
    tylko_nieprzeczytane: bool = False,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    query = (
        select(Notification)
        .where(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc())
    )
    if tylko_nieprzeczytane:
        query = query.where(Notification.read == False)
    return session.exec(query).all()


@router.post("/{notification_id}/przeczytane", status_code=204)
def oznacz_przeczytane(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    n = session.get(Notification, notification_id)
    if n and n.user_id == current_user.id:
        n.read = True
        session.add(n)
        session.commit()


@router.post("/przeczytaj-wszystkie", status_code=204)
def przeczytaj_wszystkie(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    rows = session.exec(
        select(Notification).where(
            Notification.user_id == current_user.id,
            Notification.read == False,
        )
    ).all()
    for n in rows:
        n.read = True
        session.add(n)
    session.commit()


@router.get("/licznik", response_model=dict)
def licznik_nieprzeczytanych(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    count = len(
        session.exec(
            select(Notification).where(
                Notification.user_id == current_user.id,
                Notification.read == False,
            )
        ).all()
    )
    return {"count": count}
