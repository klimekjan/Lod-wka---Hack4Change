from typing import Optional

KATEGORIE_IDX: dict[str, int] = {
    "mięso surowe": 0, "ryby": 1, "warzywa liściaste": 2,
    "nabiał": 3, "warzywa twarde": 4, "owoce": 5,
    "jajka": 6, "pieczywo": 7, "napoje": 8, "przetwory": 9, "inne": 10,
}

NIETRWALOSC: dict[str, float] = {
    "mięso surowe": 1.0, "ryby": 1.0, "warzywa liściaste": 0.9,
    "nabiał": 0.7, "warzywa twarde": 0.5, "owoce": 0.6,
    "jajka": 0.4, "pieczywo": 0.6, "napoje": 0.2, "przetwory": 0.05, "inne": 0.5,
}

SHELF_LIFE_DNI: dict[str, int] = {
    "mięso surowe": 3, "ryby": 2, "warzywa liściaste": 5,
    "nabiał": 7, "warzywa twarde": 14, "owoce": 7,
    "jajka": 21, "pieczywo": 5, "napoje": 7, "przetwory": 3650, "inne": 7,
}


def cechy(
    kategoria: str,
    dni_do_konca: Optional[float],
    shelf_life_dni: Optional[int] = None,
    ilosc_znorm: float = 0.5,
) -> list[float]:
    """Wektor cech dla modelu ryzyka zmarnowania (4 + 1 cechy)."""
    sl = shelf_life_dni or SHELF_LIFE_DNI.get(kategoria, 7)
    if dni_do_konca is None:
        dni_do_konca = float(sl)

    kat_id = KATEGORIE_IDX.get(kategoria, 10) / 10.0
    nietrw = NIETRWALOSC.get(kategoria, 0.5)
    proporcja = max(-1.0, min(1.5, dni_do_konca / max(1, sl)))
    dni_znorm = max(-1.0, min(1.0, dni_do_konca / 30.0))

    return [kat_id, nietrw, proporcja, dni_znorm, ilosc_znorm]


def ryzyko_heurystyczne(kategoria: str, dni_do_konca: Optional[float]) -> float:
    """Fallback gdy brak wytrenowanego modelu."""
    sl = SHELF_LIFE_DNI.get(kategoria, 7)
    if dni_do_konca is None:
        return 0.2
    if dni_do_konca < 0:
        return 0.95
    if dni_do_konca == 0:
        return 0.85
    nietrw = NIETRWALOSC.get(kategoria, 0.5)
    proporcja_zuzycia = 1.0 - (dni_do_konca / max(1, sl))
    return round(min(0.95, max(0.01, nietrw * 0.4 + proporcja_zuzycia * 0.6)), 3)
