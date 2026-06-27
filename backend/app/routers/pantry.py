from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from ..auth import get_current_user
from ..db import get_session
from ..models import ConsumptionLog, Event, PantryItem, ShareListing, User
from ..schemas import (
    AkcjaProduktRequest,
    AktualizujProduktRequest,
    DodajProduktRequest,
    ProduktResponse,
)
from ..services.ml.features import SHELF_LIFE_DNI
from ..services.ml.predict import przewiduj_ryzyko_batch
from ..services.shelflife import domyslne_dni

router = APIRouter(prefix="/api/spizarnia", tags=["spizarnia"])


def _dni_do_konca(expires_at: Optional[datetime]) -> Optional[int]:
    if not expires_at:
        return None
    return (expires_at - datetime.utcnow()).days


def _oblicz_dni_przy_akcji(item: PantryItem) -> Optional[int]:
    if item.expires_at:
        return (item.expires_at - datetime.utcnow()).days
    implikowany = item.added_at + timedelta(days=domyslne_dni(item.category))
    return (implikowany - datetime.utcnow()).days


def _to_response_bez_ryzyka(item: PantryItem) -> ProduktResponse:
    r = ProduktResponse.model_validate(item)
    r.days_left = _dni_do_konca(item.expires_at)
    return r


def _uzupelnij_ryzyko(responses: list[ProduktResponse], items: list[PantryItem]) -> None:
    """Liczy risk_score jedną batch-predykcją dla pozycji aktywnych (zamiast N osobnych)."""
    aktywne = [(r, it) for r, it in zip(responses, items) if it.status == "active"]
    if not aktywne:
        return
    wejscia = [
        {
            "kategoria": it.category,
            "dni_do_konca": float(r.days_left) if r.days_left is not None else None,
            "shelf_life_dni": SHELF_LIFE_DNI.get(it.category, 7),
            "ilosc_znorm": min(1.0, it.quantity / 5.0),
        }
        for r, it in aktywne
    ]
    ryzyka = przewiduj_ryzyko_batch(wejscia)
    for (r, _it), ryzyko in zip(aktywne, ryzyka):
        r.risk_score = ryzyko


def _to_response(item: PantryItem) -> ProduktResponse:
    """Pojedyncza pozycja (POST/PATCH/GET-one) — batch o rozmiarze 1."""
    r = _to_response_bez_ryzyka(item)
    _uzupelnij_ryzyko([r], [item])
    return r


@router.get("", response_model=List[ProduktResponse])
def lista_produktow(
    status: Optional[str] = "active",
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    query = select(PantryItem).where(PantryItem.user_id == current_user.id)
    if status:
        query = query.where(PantryItem.status == status)
    items = list(session.exec(query).all())
    result = [_to_response_bez_ryzyka(item) for item in items]
    _uzupelnij_ryzyko(result, items)

    event_ids = {r.event_id for r in result if r.event_id is not None}
    events_map: dict[int, str] = {}
    if event_ids:
        for e in session.exec(select(Event).where(Event.id.in_(event_ids))).all():
            events_map[e.id] = e.name
    for r in result:
        if r.event_id is not None:
            r.event_name = events_map.get(r.event_id)

    result.sort(
        key=lambda x: (
            x.days_left is None,
            x.days_left if x.days_left is not None else 9999,
            -(x.risk_score or 0),
        )
    )
    return result


@router.post("", response_model=ProduktResponse, status_code=201)
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
    return _to_response(_get_or_404(item_id, current_user.id, session))


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
        raise HTTPException(status_code=400, detail="Dozwolone akcje: eaten, wasted, shared")

    dni_przy_akcji = _oblicz_dni_przy_akcji(item)
    log = ConsumptionLog(
        user_id=current_user.id,
        item_name=item.name,
        category=item.category,
        quantity=dane.quantity or item.quantity,
        unit=item.unit,
        action=dane.action,
        weight_kg=dane.weight_kg,
        days_left_at_log=dni_przy_akcji,
    )
    session.add(log)

    if dane.action == "shared":
        if not current_user.address:
            raise HTTPException(
                status_code=400,
                detail="Najpierw ustaw adres w Ustawieniach, zeby produkt pojawil sie na mapie",
            )
        listing = ShareListing(
            user_id=current_user.id,
            item_name=item.name,
            quantity=item.quantity,
            unit=item.unit,
            city=current_user.city or "",
            address=current_user.address,
            lat=current_user.lat,
            lon=current_user.lon,
            expires_at=item.expires_at,
        )
        session.add(listing)

    item.status = dane.action
    session.add(item)
    session.commit()
    session.refresh(item)
    return _to_response(item)


@router.post("/{item_id}/przedluz", response_model=ProduktResponse)
def przedluz_termin(
    item_id: int,
    dni: int = 3,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    item = _get_or_404(item_id, current_user.id, session)
    base = item.expires_at or datetime.utcnow()
    item.expires_at = base + timedelta(days=dni)
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
    session.delete(_get_or_404(item_id, current_user.id, session))
    session.commit()


def _get_or_404(item_id: int, user_id: int, session: Session) -> PantryItem:
    item = session.get(PantryItem, item_id)
    if not item or item.user_id != user_id:
        raise HTTPException(status_code=404, detail="Produkt nie znaleziony")
    return item
