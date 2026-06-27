from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import update
from sqlmodel import Session, select

from ..auth import get_current_user
from ..db import get_session
from ..models import ShareListing, User
from ..schemas import DodajOgloszenieRequest, OgloszenieResponse
from .friends import zbior_znajomych

router = APIRouter(prefix="/api/spolecznosc", tags=["spolecznosc"])


@router.get("", response_model=List[OgloszenieResponse])
def lista_ogloszen(
    miasto: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    query = (
        select(ShareListing)
        .where(ShareListing.status == "available")
        .order_by(ShareListing.created_at.desc())
    )
    if miasto:
        query = query.where(ShareListing.city == miasto)
    listings = session.exec(query).all()

    # Batch-wczytaj wystawiających i zbiór znajomych
    user_ids = {l.user_id for l in listings}
    users_map: dict[int, User] = {}
    if user_ids:
        for u in session.exec(select(User).where(User.id.in_(user_ids))).all():
            users_map[u.id] = u
    znajomi = zbior_znajomych(session, current_user.id)

    return [_to_response(l, users_map, znajomi) for l in listings]


@router.get("/moje", response_model=List[OgloszenieResponse])
def moje_ogloszenia(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    listings = session.exec(
        select(ShareListing)
        .where(ShareListing.user_id == current_user.id)
        .order_by(ShareListing.created_at.desc())
    ).all()
    users = {current_user.id: current_user}
    return [_to_response(l, users, set(), ujawnij_kontakt=True) for l in listings]


@router.post("", response_model=OgloszenieResponse, status_code=201)
def dodaj_ogloszenie(
    dane: DodajOgloszenieRequest,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    if not current_user.address:
        raise HTTPException(
            status_code=400,
            detail="Najpierw ustaw adres w Ustawieniach, zeby produkt pojawil sie na mapie",
        )
    listing = ShareListing(
        user_id=current_user.id,
        item_name=dane.item_name,
        quantity=dane.quantity,
        unit=dane.unit,
        city=dane.city or current_user.city or "",
        address=current_user.address,
        lat=current_user.lat,
        lon=current_user.lon,
        expires_at=dane.expires_at,
    )
    session.add(listing)
    session.commit()
    session.refresh(listing)
    return _to_response(listing, {current_user.id: current_user}, set())


@router.post("/{listing_id}/zarezerwuj", response_model=OgloszenieResponse)
def zarezerwuj(
    listing_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    listing = _get_or_404(listing_id, session)
    if listing.user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Nie możesz zarezerwować własnego ogłoszenia")
    # Atomowe przejście available→reserved: warunek w WHERE eliminuje wyścig dwóch rezerwacji.
    # session.execute (nie exec) — natywny CursorResult wystawia .rowcount.
    wynik = session.execute(
        update(ShareListing)
        .where(ShareListing.id == listing_id, ShareListing.status == "available")
        .values(status="reserved", reserved_by=current_user.id)
    )
    session.commit()
    if wynik.rowcount == 0:
        raise HTTPException(status_code=409, detail="Produkt jest już zarezerwowany lub odebrany")
    session.refresh(listing)
    poster = session.get(User, listing.user_id)
    users = {listing.user_id: poster} if poster else {}
    znajomi = zbior_znajomych(session, current_user.id)
    return _to_response(listing, users, znajomi, ujawnij_kontakt=True)


@router.post("/{listing_id}/odebrane", response_model=OgloszenieResponse)
def oznacz_odebrane(
    listing_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    listing = _get_or_404(listing_id, session)
    if listing.user_id != current_user.id and listing.reserved_by != current_user.id:
        raise HTTPException(status_code=403, detail="Brak uprawnień")
    listing.status = "picked_up"
    session.add(listing)
    session.commit()
    session.refresh(listing)
    poster = session.get(User, listing.user_id)
    users = {listing.user_id: poster} if poster else {}
    znajomi = zbior_znajomych(session, current_user.id)
    return _to_response(listing, users, znajomi)


@router.delete("/{listing_id}", status_code=204)
def usun_ogloszenie(
    listing_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    listing = session.get(ShareListing, listing_id)
    if not listing or listing.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Ogłoszenie nie znalezione")
    session.delete(listing)
    session.commit()


def _get_or_404(listing_id: int, session: Session) -> ShareListing:
    listing = session.get(ShareListing, listing_id)
    if not listing:
        raise HTTPException(status_code=404, detail="Ogłoszenie nie znalezione")
    return listing


def _to_response(
    listing: ShareListing,
    users: dict,
    znajomi: set,
    ujawnij_kontakt: bool = False,
) -> OgloszenieResponse:
    kontakt = None
    if ujawnij_kontakt and listing.status == "reserved" and listing.reserved_by:
        wystawiajacy = users.get(listing.user_id)
        if wystawiajacy:
            kontakt = wystawiajacy.email

    wlasciciel = users.get(listing.user_id)
    return OgloszenieResponse(
        id=listing.id,
        user_id=listing.user_id,
        item_name=listing.item_name,
        quantity=listing.quantity,
        unit=listing.unit,
        city=listing.city,
        address=listing.address,
        lat=listing.lat,
        lon=listing.lon,
        status=listing.status,
        reserved_by=listing.reserved_by,
        expires_at=listing.expires_at,
        created_at=listing.created_at,
        kontakt_email=kontakt,
        wlasciciel_imie=wlasciciel.first_name if wlasciciel else None,
        wlasciciel_nazwisko=wlasciciel.last_name if wlasciciel else None,
        wlasciciel_nick=wlasciciel.nick if wlasciciel else None,
        wlasciciel_znajomy=listing.user_id in znajomi,
    )
