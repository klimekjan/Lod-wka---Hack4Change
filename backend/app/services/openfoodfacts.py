import json
from datetime import datetime

import httpx
from sqlmodel import Session

from ..models import ProductCache

OFF_URL = "https://world.openfoodfacts.org/api/v2/product/{barcode}.json"
OFF_SEARCH_URL = "https://world.openfoodfacts.org/api/v2/search"
OFF_ES_URL = "https://search.openfoodfacts.org/search"

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
        or product.get("product_name_en")
        or product.get("product_name_de")
        or product.get("product_name_fr")
        or product.get("generic_name_pl")
        or product.get("generic_name")
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


async def search_suggestions_es(query: str, session: Session | None = None, n: int = 8) -> list[dict]:
    """Szybki Elasticsearch OFF — 0.1-0.3s, zwraca produkty z obrazkami."""
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.get(OFF_ES_URL, params={
                "q": query,
                "page_size": n,
                "fields": "code,product_name_pl,product_name,image_front_small_url,categories_tags",
            })
            data = resp.json()
    except Exception:
        return []

    results = []
    to_cache = []
    for product in data.get("hits", []):
        name = (
            product.get("product_name_pl")
            or product.get("product_name")
            or ""
        ).strip()
        if not name:
            continue
        category = _mapuj_kategorie(product.get("categories_tags", []))
        image_url = product.get("image_front_small_url") or None
        code = (product.get("code") or "").strip()
        if session is not None and code and not session.get(ProductCache, code):
            to_cache.append(ProductCache(
                barcode=code,
                name=name,
                category=category,
                image_url=image_url,
                raw_json="{}",
                fetched_at=datetime.utcnow(),
            ))
        results.append({"name": name, "category": category, "image_url": image_url})

    if session is not None and to_cache:
        for item in to_cache:
            session.add(item)
        try:
            session.commit()
        except Exception:
            session.rollback()

    return results


async def search_suggestions(query: str, session: Session | None = None, n: int = 8) -> list[dict]:
    try:
        async with httpx.AsyncClient(timeout=6.0) as client:
            resp = await client.get(OFF_SEARCH_URL, params={
                "search_terms": query,
                "page_size": n,
                "fields": "code,product_name,product_name_pl,categories_tags,image_front_small_url,image_url",
            })
            data = resp.json()
    except Exception:
        return []

    results = []
    to_cache = []
    for product in data.get("products", []):
        name = (
            product.get("product_name_pl")
            or product.get("product_name")
            or ""
        ).strip()
        if not name:
            continue
        category = _mapuj_kategorie(product.get("categories_tags", []))
        image_url = product.get("image_front_small_url") or product.get("image_url")
        code = (product.get("code") or "").strip()
        if session is not None and code and not session.get(ProductCache, code):
            to_cache.append(ProductCache(
                barcode=code,
                name=name,
                category=category,
                image_url=image_url,
                raw_json=json.dumps(product, ensure_ascii=False)[:4000],
                fetched_at=datetime.utcnow(),
            ))
        results.append({"name": name, "category": category, "image_url": image_url})

    if session is not None and to_cache:
        for item in to_cache:
            session.add(item)
        try:
            session.commit()
        except Exception:
            session.rollback()

    return results


async def search_by_name(query: str, session: Session | None = None) -> dict | None:
    try:
        async with httpx.AsyncClient(timeout=6.0) as client:
            resp = await client.get(OFF_SEARCH_URL, params={
                "search_terms": query,
                "page_size": 1,
                "fields": "code,product_name,product_name_pl,categories_tags,image_front_small_url,image_url",
            })
            data = resp.json()
    except Exception:
        return None

    products = data.get("products", [])
    if not products:
        return None

    product = products[0]
    name = (
        product.get("product_name_pl")
        or product.get("product_name")
        or ""
    ).strip()
    if not name:
        return None

    category = _mapuj_kategorie(product.get("categories_tags", []))
    image_url = product.get("image_front_small_url") or product.get("image_url")

    # Cache po barcode jesli OFF zwrocil kod — kolejne skany tego produktu trafia w cache.
    code = (product.get("code") or "").strip()
    if session is not None and code and not session.get(ProductCache, code):
        session.add(ProductCache(
            barcode=code,
            name=name,
            category=category,
            image_url=image_url,
            raw_json=json.dumps(product, ensure_ascii=False)[:4000],
            fetched_at=datetime.utcnow(),
        ))
        session.commit()

    return {"name": name, "category": category, "image_url": image_url}
