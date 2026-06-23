from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from ..db import get_session
from ..models import PantryItem, ConsumptionLog, User
from ..auth import get_current_user
from ..schemas import (
    DodajProduktRequest,
    AktualizujProduktRequest,
    ProduktResponse,
    AkcjaProduktRequest,
)

router = APIRouter(prefix="/api/spizarnia", tags=["spizarnia"])


def _dni_do_konca(expires_at: Optional[datetime]) -> Optional[int]:
    if not expires_at:
        return None
    return (expires_at - datetime.utcnow()).days


def _to_response(item: PantryItem) -> ProduktResponse:
    r = ProduktResponse.from_orm(item)
    r.days_left = _dni_do_konca(item.expires_at)
    return r


@router.get("/", response_model=List[ProduktResponse])
def lista_produktow(
    status: Optional[str] = "active",
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    query = select(PantryItem).where(PantryItem.user_id == current_user.id)
    if status:
        query = query.where(PantryItem.status == status)
    items = session.exec(query).all()
    result = [_to_response(item) for item in items]
    result.sort(key=lambda x: (x.days_left is None, x.days_left if x.days_left is not None else 9999))
    return result


@router.post("/", response_model=ProduktResponse, status_code=201)
def dodaj_produkt(
    dane: DodajProduktRequest,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    item = PantryItem(
        user_id=current_user.id,
        name=dane.name,
        category=dane.category,
        quantity=dane.quantity,
        unit=dane.unit,
        barcode=dane.barcode,
        image_url=dane.image_url,
        expires_at=dane.expires_at,
    )
    session.add(item)
    session.commit()
    session.refresh(item)
    return _to_response(item)


@router.get("/{item_id}", response_model=ProduktResponse)
def pobierz_produkt(
    item_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    item = _get_or_404(item_id, current_user.id, session)
    return _to_response(item)


@router.patch("/{item_id}", response_model=ProduktResponse)
def aktualizuj_produkt(
    item_id: int,
    dane: AktualizujProduktRequest,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    item = _get_or_404(item_id, current_user.id, session)
    if dane.name is not None:
        item.name = dane.name
    if dane.category is not None:
        item.category = dane.category
    if dane.quantity is not None:
        item.quantity = dane.quantity
    if dane.unit is not None:
        item.unit = dane.unit
    if dane.expires_at is not None:
        item.expires_at = dane.expires_at
    session.add(item)
    session.commit()
    session.refresh(item)
    return _to_response(item)


@router.post("/{item_id}/akcja", response_model=ProduktResponse)
def akcja_produktu(
    item_id: int,
    dane: AkcjaProduktRequest,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    item = _get_or_404(item_id, current_user.id, session)
    if dane.action not in ("eaten", "wasted", "shared"):
        raise HTTPException(status_code=400, detail="Nieznana akcja. Dozwolone: eaten, wasted, shared")

    if dane.action in ("eaten", "wasted"):
        log = ConsumptionLog(
            user_id=current_user.id,
            item_name=item.name,
            category=item.category,
            quantity=dane.quantity or item.quantity,
            unit=item.unit,
            action=dane.action,
            weight_kg=dane.weight_kg,
        )
        session.add(log)

    item.status = dane.action
    session.add(item)
    session.commit()
    session.refresh(item)
    return _to_response(item)


@router.delete("/{item_id}", status_code=204)
def usun_produkt(
    item_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    item = _get_or_404(item_id, current_user.id, session)
    session.delete(item)
    session.commit()


def _get_or_404(item_id: int, user_id: int, session: Session) -> PantryItem:
    item = session.get(PantryItem, item_id)
    if not item or item.user_id != user_id:
        raise HTTPException(status_code=404, detail="Produkt nie znaleziony")
    return item
