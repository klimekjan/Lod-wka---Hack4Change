from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from ..auth import get_current_user
from ..db import get_session
from ..models import Event, EventParticipant, PantryItem, User
from ..schemas import (
    DodajWydarzenieRequest,
    PrzekazProduktyRequest,
    UczestnikResponse,
    WydarzenieResponse,
    WydarzenieSzczegolyResponse,
    ProduktKrotki,
)
from ..services.geocoding import geokoduj_szczegolowo
from .friends import zbior_znajomych

router = APIRouter(prefix="/api/wydarzenia", tags=["wydarzenia"])


def _to_response(
    event: Event,
    users: dict,
    znajomi: set,
    liczba_uczestnikow: int,
    czy_uczestnicze: bool,
    current_user_id: int,
) -> WydarzenieResponse:
    org = users.get(event.organizer_id)
    return WydarzenieResponse(
        id=event.id,
        organizer_id=event.organizer_id,
        name=event.name,
        description=event.description,
        address=event.address,
        city=event.city,
        lat=event.lat,
        lon=event.lon,
        event_at=event.event_at,
        status=event.status,
        created_at=event.created_at,
        organizator_imie=org.first_name if org else None,
        organizator_nazwisko=org.last_name if org else None,
        organizator_nick=org.nick if org else None,
        organizator_znajomy=event.organizer_id in znajomi,
        liczba_uczestnikow=liczba_uczestnikow,
        czy_uczestnicze=czy_uczestnicze,
        czy_moje=event.organizer_id == current_user_id,
    )


def _get_or_404(event_id: int, session: Session) -> Event:
    event = session.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Wydarzenie nie znalezione")
    return event


def _czy_uczestnik(event_id: int, user_id: int, session: Session) -> bool:
    return bool(
        session.exec(
            select(EventParticipant).where(
                EventParticipant.event_id == event_id,
                EventParticipant.user_id == user_id,
            )
        ).first()
    )


@router.get("", response_model=List[WydarzenieResponse])
def lista_wydarzen(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    events = session.exec(
        select(Event).where(Event.status == "active").order_by(Event.event_at)
    ).all()

    if not events:
        return []

    user_ids = {e.organizer_id for e in events}
    users_map: dict[int, User] = {}
    for u in session.exec(select(User).where(User.id.in_(user_ids))).all():
        users_map[u.id] = u

    znajomi = zbior_znajomych(session, current_user.id)

    event_ids = [e.id for e in events]
    uczestnicy = session.exec(
        select(EventParticipant).where(EventParticipant.event_id.in_(event_ids))
    ).all()

    liczby: dict[int, int] = {}
    moje: set[int] = set()
    for ep in uczestnicy:
        liczby[ep.event_id] = liczby.get(ep.event_id, 0) + 1
        if ep.user_id == current_user.id:
            moje.add(ep.event_id)

    return [
        _to_response(
            e,
            users_map,
            znajomi,
            liczby.get(e.id, 0),
            e.id in moje,
            current_user.id,
        )
        for e in events
    ]


@router.get("/{event_id}", response_model=WydarzenieSzczegolyResponse)
def szczegoly_wydarzenia(
    event_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    event = _get_or_404(event_id, session)

    uczestnicy = session.exec(
        select(EventParticipant).where(EventParticipant.event_id == event_id)
    ).all()

    user_ids = {ep.user_id for ep in uczestnicy} | {event.organizer_id}
    users_map: dict[int, User] = {}
    for u in session.exec(select(User).where(User.id.in_(user_ids))).all():
        users_map[u.id] = u

    znajomi = zbior_znajomych(session, current_user.id)

    produkty_wydarzenia = session.exec(
        select(PantryItem).where(
            PantryItem.event_id == event_id,
            PantryItem.status == "active",
        )
    ).all()

    produkty_per_user: dict[int, list[ProduktKrotki]] = {}
    for p in produkty_wydarzenia:
        produkty_per_user.setdefault(p.user_id, []).append(
            ProduktKrotki(item_name=p.name, quantity=p.quantity, unit=p.unit)
        )

    uczestnicy_response = []
    moje = False
    for ep in uczestnicy:
        u = users_map.get(ep.user_id)
        uczestnicy_response.append(
            UczestnikResponse(
                user_id=ep.user_id,
                imie=u.first_name if u else None,
                nazwisko=u.last_name if u else None,
                nick=u.nick if u else None,
                produkty=produkty_per_user.get(ep.user_id, []),
            )
        )
        if ep.user_id == current_user.id:
            moje = True

    base = _to_response(event, users_map, znajomi, len(uczestnicy), moje, current_user.id)
    return WydarzenieSzczegolyResponse(**base.model_dump(), uczestnicy=uczestnicy_response)


@router.post("", response_model=WydarzenieResponse, status_code=201)
def dodaj_wydarzenie(
    dane: DodajWydarzenieRequest,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    wynik = geokoduj_szczegolowo(dane.address)
    if not wynik:
        raise HTTPException(
            status_code=400,
            detail="Nie udało się ustalić lokalizacji adresu. Podaj dokładniejszy adres.",
        )
    lat, lon, city = wynik

    event = Event(
        organizer_id=current_user.id,
        name=dane.name,
        description=dane.description,
        address=dane.address,
        city=city,
        lat=lat,
        lon=lon,
        event_at=dane.event_at,
    )
    # Jedna transakcja: flush nadaje event.id, dopisujemy organizatora jako uczestnika,
    # commit obejmuje oba wiersze (brak osieroconego wydarzenia gdy drugi zapis padnie).
    session.add(event)
    session.flush()
    session.add(EventParticipant(event_id=event.id, user_id=current_user.id))
    session.commit()
    session.refresh(event)

    return _to_response(
        event,
        {current_user.id: current_user},
        set(),
        1,
        True,
        current_user.id,
    )


@router.post("/{event_id}/dolacz", response_model=WydarzenieResponse)
def dolacz_do_wydarzenia(
    event_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    event = _get_or_404(event_id, session)

    if not _czy_uczestnik(event_id, current_user.id, session):
        uczestnik = EventParticipant(event_id=event_id, user_id=current_user.id)
        session.add(uczestnik)
        session.commit()

    uczestnicy = session.exec(
        select(EventParticipant).where(EventParticipant.event_id == event_id)
    ).all()
    user_ids = {ep.user_id for ep in uczestnicy} | {event.organizer_id}
    users_map = {u.id: u for u in session.exec(select(User).where(User.id.in_(user_ids))).all()}
    znajomi = zbior_znajomych(session, current_user.id)

    return _to_response(event, users_map, znajomi, len(uczestnicy), True, current_user.id)


@router.delete("/{event_id}/dolacz", status_code=204)
def wypisz_z_wydarzenia(
    event_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    event = _get_or_404(event_id, session)
    if event.organizer_id == current_user.id:
        raise HTTPException(status_code=400, detail="Organizator nie może opuścić własnego wydarzenia")

    # Wycofaj produkty przekazane na to wydarzenie, zeby nie zostaly osierocone po wypisaniu.
    for p in session.exec(
        select(PantryItem).where(
            PantryItem.user_id == current_user.id,
            PantryItem.event_id == event_id,
        )
    ).all():
        p.event_id = None
        session.add(p)

    ep = session.exec(
        select(EventParticipant).where(
            EventParticipant.event_id == event_id,
            EventParticipant.user_id == current_user.id,
        )
    ).first()
    if ep:
        session.delete(ep)
    session.commit()


@router.put("/{event_id}/moje-produkty", response_model=WydarzenieResponse)
def przekaz_produkty(
    event_id: int,
    dane: PrzekazProduktyRequest,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    event = _get_or_404(event_id, session)

    wlasne_aktywne = session.exec(
        select(PantryItem).where(
            PantryItem.user_id == current_user.id,
            PantryItem.status == "active",
        )
    ).all()
    wlasne_ids = {p.id for p in wlasne_aktywne}

    for pid in dane.pantry_item_ids:
        if pid not in wlasne_ids:
            raise HTTPException(status_code=403, detail=f"Produkt {pid} nie należy do Ciebie")

    nowe_ids = set(dane.pantry_item_ids)

    for p in wlasne_aktywne:
        if p.event_id == event_id and p.id not in nowe_ids:
            p.event_id = None
            session.add(p)
        elif p.id in nowe_ids and p.event_id != event_id:
            p.event_id = event_id
            session.add(p)

    if not _czy_uczestnik(event_id, current_user.id, session):
        session.add(EventParticipant(event_id=event_id, user_id=current_user.id))

    session.commit()

    uczestnicy = session.exec(
        select(EventParticipant).where(EventParticipant.event_id == event_id)
    ).all()
    user_ids = {ep.user_id for ep in uczestnicy} | {event.organizer_id}
    users_map = {u.id: u for u in session.exec(select(User).where(User.id.in_(user_ids))).all()}
    znajomi = zbior_znajomych(session, current_user.id)
    czy_uczestnicze = _czy_uczestnik(event_id, current_user.id, session)

    return _to_response(event, users_map, znajomi, len(uczestnicy), czy_uczestnicze, current_user.id)


@router.delete("/{event_id}", status_code=204)
def usun_wydarzenie(
    event_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    event = _get_or_404(event_id, session)
    if event.organizer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Tylko organizator może usunąć wydarzenie")

    for p in session.exec(
        select(PantryItem).where(PantryItem.event_id == event_id)
    ).all():
        p.event_id = None
        session.add(p)

    for ep in session.exec(
        select(EventParticipant).where(EventParticipant.event_id == event_id)
    ).all():
        session.delete(ep)

    session.delete(event)
    session.commit()
