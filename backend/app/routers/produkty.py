from typing import List

from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from ..auth import get_current_user
from ..db import get_session
from ..models import User, ProductCache
from ..schemas import BarcodeLookupResponse, SugestiaProduktu
from ..services.openfoodfacts import lookup_barcode, search_by_name, search_suggestions_es
from ..services.local_products import szukaj_lokalnie
from ..services.shelflife import domyslne_dni

router = APIRouter(prefix="/api/produkty", tags=["produkty"])


@router.get("/sugestie", response_model=List[SugestiaProduktu])
async def sugestie_produktow(
    q: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    q = q.strip()
    if len(q) < 2:
        return []

    # 1. ProductCache — produkty z poprzednich skanów barcodu (obrazki pewne)
    z_cache = session.exec(
        select(ProductCache)
        .where(ProductCache.name.ilike(f"%{q}%"))
        .limit(5)
    ).all()
    wyniki: list[dict] = [
        {"name": c.name, "category": c.category, "image_url": c.image_url}
        for c in z_cache
    ]
    uzyte = {r["name"].lower() for r in wyniki}

    # 2. OFF Elasticsearch — szybki (~0.2s), zwraca obrazki dla nowych produktów
    es_wyniki = await search_suggestions_es(q, session, n=8)
    for p in es_wyniki:
        if p["name"].lower() not in uzyte:
            wyniki.append(p)
            uzyte.add(p["name"].lower())

    # 3. Lokalna lista — fallback gdy ES nie ma pokrycia
    for p in szukaj_lokalnie(q, n=8):
        if p["name"].lower() not in uzyte:
            wyniki.append(p)
            uzyte.add(p["name"].lower())

    return [
        SugestiaProduktu(
            name=s["name"],
            category=s["category"],
            image_url=s.get("image_url"),
            default_shelf_days=domyslne_dni(s["category"]),
        )
        for s in wyniki[:8]
    ]


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
        result = await search_by_name(q, session)

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
