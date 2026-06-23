from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from ..db import get_session
from ..models import ShareListing, User
from ..auth import get_current_user
from ..schemas import DodajOgloszenieRequest, OgloszenieResponse

router = APIRouter(prefix="/api/spolecznosc", tags=["spolecznosc"])


@router.get("/", response_model=List[OgloszenieResponse])
def lista_ogloszen(
    miasto: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    query = select(ShareListing).where(ShareListing.status == "available").order_by(ShareListing.created_at.desc())
    if miasto:
        query = query.where(ShareListing.city == miasto)
    listings = session.exec(query).all()
    return [_to_response(l, session) for l in listings]


@router.post("/", response_model=OgloszenieResponse, status_code=201)
def dodaj_ogloszenie(
    dane: DodajOgloszenieRequest,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    listing = ShareListing(
        user_id=current_user.id,
        item_name=dane.item_name,
        quantity=dane.quantity,
        unit=dane.unit,
        city=dane.city or current_user.city or "",
        expires_at=dane.expires_at,
    )
    session.add(listing)
    session.commit()
    session.refresh(listing)
    return _to_response(listing, session)


@router.post("/{listing_id}/zarezerwuj", response_model=OgloszenieResponse)
def zarezerwuj(
    listing_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    listing = session.get(ShareListing, listing_id)
    if not listing:
        raise HTTPException(status_code=404, detail="Ogloszenie nie znalezione")
    if listing.status != "available":
        raise HTTPException(status_code=409, detail="Produkt juz zarezerwowany lub odebrany")
    if listing.user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Nie mozna zarezerwowac wlasnego ogloszenia")
    listing.status = "reserved"
    listing.reserved_by = current_user.id
    session.add(listing)
    session.commit()
    session.refresh(listing)
    return _to_response(listing, session, ujawnij_kontakt=True)


@router.post("/{listing_id}/odebrane", response_model=OgloszenieResponse)
def oznacz_odebrane(
    listing_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    listing = session.get(ShareListing, listing_id)
    if not listing:
        raise HTTPException(status_code=404, detail="Ogloszenie nie znalezione")
    if listing.user_id != current_user.id and listing.reserved_by != current_user.id:
        raise HTTPException(status_code=403, detail="Brak uprawnien")
    listing.status = "picked_up"
    session.add(listing)
    session.commit()
    session.refresh(listing)
    return _to_response(listing, session)


@router.delete("/{listing_id}", status_code=204)
def usun_ogloszenie(
    listing_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    listing = session.get(ShareListing, listing_id)
    if not listing or listing.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Ogloszenie nie znalezione")
    session.delete(listing)
    session.commit()


def _to_response(
    listing: ShareListing,
    session: Session,
    ujawnij_kontakt: bool = False,
) -> OgloszenieResponse:
    kontakt = None
    if ujawnij_kontakt and listing.status == "reserved":
        wystawiajacy = session.get(User, listing.user_id)
        if wystawiajacy:
            kontakt = wystawiajacy.email
    return OgloszenieResponse(
        id=listing.id,
        user_id=listing.user_id,
        item_name=listing.item_name,
        quantity=listing.quantity,
        unit=listing.unit,
        city=listing.city,
        status=listing.status,
        expires_at=listing.expires_at,
        created_at=listing.created_at,
        kontakt_email=kontakt,
    )
