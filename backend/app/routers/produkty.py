from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from sqlmodel import Session

from ..auth import get_current_user
from ..db import get_session
from ..models import User
from ..schemas import BarcodeLookupResponse
from ..services.openfoodfacts import lookup_barcode, search_by_name
from ..services.shelflife import domyslne_dni

router = APIRouter(prefix="/api/produkty", tags=["produkty"])


@router.get("/szukaj", response_model=BarcodeLookupResponse)
async def szukaj_produkt(
    q: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    q = q.strip()
    if q.isdigit() and 8 <= len(q) <= 14:
        result = await lookup_barcode(q, session)
    else:
        result = await search_by_name(q)

    if not result or not result.get("name"):
        return BarcodeLookupResponse(found=False)

    shelf_days = domyslne_dni(result["category"])
    return BarcodeLookupResponse(
        found=True,
        name=result["name"],
        category=result["category"],
        image_url=result.get("image_url"),
        default_shelf_days=shelf_days,
    )


@router.get("/barcode/{barcode}", response_model=BarcodeLookupResponse)
async def skanuj_barcode(
    barcode: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    result = await lookup_barcode(barcode, session)
    if not result or not result.get("name"):
        return BarcodeLookupResponse(found=False)

    shelf_days = domyslne_dni(result["category"])
    return BarcodeLookupResponse(
        found=True,
        name=result["name"],
        category=result["category"],
        image_url=result.get("image_url"),
        default_shelf_days=shelf_days,
    )
