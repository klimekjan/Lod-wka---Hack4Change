import json
from datetime import datetime

import httpx
from sqlmodel import Session

from ..models import ProductCache

OFF_URL = "https://world.openfoodfacts.org/api/v2/product/{barcode}.json"

KATEGORIE_MAP = {
    "dairy": "nabiał",
    "milk": "nabiał",
    "cheese": "nabiał",
    "yogurt": "nabiał",
    "meat": "mięso surowe",
    "beef": "mięso surowe",
    "chicken": "mięso surowe",
    "pork": "mięso surowe",
    "fish": "ryby",
    "seafood": "ryby",
    "vegetable": "warzywa twarde",
    "salad": "warzywa liściaste",
    "lettuce": "warzywa liściaste",
    "fruit": "owoce",
    "bread": "pieczywo",
    "pastry": "pieczywo",
    "bakery": "pieczywo",
    "egg": "jajka",
    "beverage": "napoje",
    "drink": "napoje",
    "juice": "napoje",
    "canned": "przetwory",
    "preserved": "przetwory",
    "jam": "przetwory",
}


def _mapuj_kategorie(tags: list) -> str:
    joined = " ".join(tags).lower()
    for kluczowe, kategoria in KATEGORIE_MAP.items():
        if kluczowe in joined:
            return kategoria
    return "inne"


async def lookup_barcode(barcode: str, session: Session) -> dict | None:
    cached = session.get(ProductCache, barcode)
    if cached:
        return {"name": cached.name, "category": cached.category, "image_url": cached.image_url}

    try:
        async with httpx.AsyncClient(timeout=6.0) as client:
            resp = await client.get(OFF_URL.format(barcode=barcode))
            data = resp.json()
    except Exception:
        return None

    if data.get("status") != 1:
        return None

    product = data.get("product", {})
    name = (
        product.get("product_name_pl")
        or product.get("product_name")
        or ""
    ).strip()

    if not name:
        return None

    category = _mapuj_kategorie(product.get("categories_tags", []))
    image_url = product.get("image_front_small_url") or product.get("image_url")

    session.add(ProductCache(
        barcode=barcode,
        name=name,
        category=category,
        image_url=image_url,
        raw_json=json.dumps(product, ensure_ascii=False)[:4000],
        fetched_at=datetime.utcnow(),
    ))
    session.commit()

    return {"name": name, "category": category, "image_url": image_url}
