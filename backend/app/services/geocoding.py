"""Geokodowanie adresu -> wspolrzedne przez Nominatim (OpenStreetMap).

Darmowe, bez klucza API. Polityka Nominatim wymaga naglowka User-Agent i limitu
1 zapytania na sekunde — w aplikacji geokodujemy tylko przy zmianie adresu w profilu.
"""
from typing import Optional, Tuple

import httpx

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
USER_AGENT = "Lodowka-Hack4Change/1.0 (https://github.com/klimekjan/Lod-wka---Hack4Change)"


def geokoduj(adres: str) -> Optional[Tuple[float, float]]:
    """Zwraca (lat, lon) dla adresu albo None gdy nie znaleziono / blad sieci."""
    if not adres or not adres.strip():
        return None
    try:
        resp = httpx.get(
            NOMINATIM_URL,
            params={"q": adres, "format": "json", "limit": 1, "countrycodes": "pl"},
            headers={"User-Agent": USER_AGENT},
            timeout=10.0,
        )
        resp.raise_for_status()
        wyniki = resp.json()
        if not wyniki:
            return None
        return float(wyniki[0]["lat"]), float(wyniki[0]["lon"])
    except (httpx.HTTPError, KeyError, ValueError, IndexError):
        return None
