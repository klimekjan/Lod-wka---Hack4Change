from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from ..db import get_session
from ..models import Notification, PantryItem, User
from ..auth import get_current_user
from ..schemas import NotificationItem, NotificationResponse

router = APIRouter(prefix="/api/powiadomienia", tags=["powiadomienia"])


def _dni_do_konca(expires_at: Optional[datetime]) -> Optional[int]:
    if not expires_at:
        return None
    return (expires_at - datetime.utcnow()).days


def _produkt_response(item: PantryItem) -> NotificationItem:
    return NotificationItem(
        id=item.id,
        name=item.name,
        category=item.category,
        quantity=item.quantity,
        unit=item.unit,
        image_url=item.image_url,
        expires_at=item.expires_at,
        days_left=_dni_do_konca(item.expires_at),
        status=item.status,
    )


@router.get("", response_model=List[NotificationResponse])
def lista_powiadomien(
    tylko_nieprzeczytane: bool = False,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    query = (
        select(Notification)
        .where(
            Notification.user_id == current_user.id,
            Notification.type != "friend_request",
        )
        .order_by(Notification.created_at.desc())
    )
    if tylko_nieprzeczytane:
        query = query.where(Notification.read == False)
    notyfikacje = list(session.exec(query).all())

    item_ids = {n.item_id for n in notyfikacje if n.item_id is not None}
    produkty_map: dict[int, PantryItem] = {}
    if item_ids:
        for p in session.exec(select(PantryItem).where(PantryItem.id.in_(item_ids))).all():
            produkty_map[p.id] = p

    result = []
    for n in notyfikacje:
        resp = NotificationResponse(
            id=n.id,
            type=n.type,
            message=n.message,
            item_id=n.item_id,
            created_at=n.created_at,
            read=n.read,
        )
        if n.item_id and n.item_id in produkty_map:
            item = produkty_map[n.item_id]
            if item.status == "active":
                resp.produkt = _produkt_response(item)
        result.append(resp)
    return result


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
                Notification.type != "friend_request",
            )
        ).all()
    )
    return {"count": count}


@router.post("/test", status_code=201)
def test_powiadomienie(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    kandydat = session.exec(
        select(PantryItem)
        .where(PantryItem.user_id == current_user.id, PantryItem.status == "active")
        .order_by(PantryItem.expires_at)
    ).first()

    if not kandydat:
        kandydat = PantryItem(
            user_id=current_user.id,
            name="Testowe mleko",
            category="nabiał",
            quantity=1.0,
            unit="opak.",
            expires_at=datetime.utcnow() + timedelta(days=1),
        )
        session.add(kandydat)
        session.commit()
        session.refresh(kandydat)

    msg = f"Testowe — {kandydat.name} wygasa za {_dni_do_konca(kandydat.expires_at) or 0} dni!"
    n = Notification(
        user_id=current_user.id,
        type="expiry",
        message=msg,
        item_id=kandydat.id,
        read=False,
        created_at=datetime.utcnow(),
    )
    session.add(n)
    session.commit()
    session.refresh(n)
    return {"id": n.id}
