"""Geokodowanie adresu -> wspolrzedne przez Nominatim (OpenStreetMap).

Darmowe, bez klucza API. Polityka Nominatim wymaga naglowka User-Agent i limitu
1 zapytania na sekunde — w aplikacji geokodujemy tylko przy zmianie adresu w profilu.
"""
from typing import Optional, Tuple

import httpx

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
USER_AGENT = "Lodowka-Hack4Change/1.0 (https://github.com/klimekjan/Lod-wka---Hack4Change)"


def geokoduj_szczegolowo(adres: str) -> Optional[Tuple[float, float, Optional[str]]]:
    """Zwraca (lat, lon, miasto) albo None gdy nie znaleziono / blad sieci."""
    if not adres or not adres.strip():
        return None
    try:
        resp = httpx.get(
            NOMINATIM_URL,
            params={"q": adres, "format": "json", "limit": 1, "countrycodes": "pl", "addressdetails": 1},
            headers={"User-Agent": USER_AGENT},
            timeout=10.0,
        )
        resp.raise_for_status()
        wyniki = resp.json()
        if not wyniki:
            return None
        wynik = wyniki[0]
        lat = float(wynik["lat"])
        lon = float(wynik["lon"])
        addr = wynik.get("address", {})
        miasto = (
            addr.get("city")
            or addr.get("town")
            or addr.get("village")
            or addr.get("municipality")
        )
        return lat, lon, miasto
    except (httpx.HTTPError, KeyError, ValueError, IndexError):
        return None


def geokoduj(adres: str) -> Optional[Tuple[float, float]]:
    """Zwraca (lat, lon) dla adresu albo None gdy nie znaleziono / blad sieci."""
    wynik = geokoduj_szczegolowo(adres)
    if wynik is None:
        return None
    return wynik[0], wynik[1]
