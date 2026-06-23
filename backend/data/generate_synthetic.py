"""
Generuje syntetyczne dane treningowe dla modelu ryzyka zmarnowania.
Uruchom raz przed trenowaniem: python -m data.generate_synthetic

Wynik: data/training_data.csv
"""
import csv
import os
import random
from pathlib import Path

DATA_DIR = Path(__file__).parent

KATEGORIE = [
    "mięso surowe", "ryby", "warzywa liściaste", "nabiał",
    "warzywa twarde", "owoce", "jajka", "pieczywo", "napoje", "przetwory", "inne",
]

SHELF_LIFE = {
    "mięso surowe": 3, "ryby": 2, "warzywa liściaste": 5,
    "nabiał": 7, "warzywa twarde": 14, "owoce": 7,
    "jajka": 21, "pieczywo": 5, "napoje": 7, "przetwory": 3650, "inne": 7,
}

NIETRWALOSC = {
    "mięso surowe": 1.0, "ryby": 1.0, "warzywa liściaste": 0.9,
    "nabiał": 0.7, "warzywa twarde": 0.5, "owoce": 0.6,
    "jajka": 0.4, "pieczywo": 0.6, "napoje": 0.2, "przetwory": 0.05, "inne": 0.5,
}

SREDNIE_ZUZYCIE_DNI = {
    "mięso surowe": 2, "ryby": 2, "warzywa liściaste": 4, "nabiał": 5,
    "warzywa twarde": 10, "owoce": 5, "jajka": 14, "pieczywo": 4,
    "napoje": 6, "przetwory": 180, "inne": 7,
}


def _prawd_marnotrawstwa(kategoria: str, dni_do_konca: float) -> float:
    sl = SHELF_LIFE[kategoria]
    nietrw = NIETRWALOSC[kategoria]

    if dni_do_konca < 0:
        return 0.85 + random.uniform(0, 0.1)
    if dni_do_konca == 0:
        return 0.7
    proporcja = 1.0 - (dni_do_konca / max(1, sl))
    base = nietrw * 0.35 + proporcja * 0.65
    return min(0.9, max(0.02, base + random.gauss(0, 0.05)))


def generuj(n_probek: int = 3000) -> None:
    random.seed(42)
    wiersze = []

    for _ in range(n_probek):
        kat = random.choice(KATEGORIE)
        sl = SHELF_LIFE[kat]

        # Symuluj różne stany: świeży, na wylocie, przeterminowany
        losowy_offset = random.gauss(0.3, 0.5)  # lekkie przesunięcie ku końcowi
        dni = sl * (1.0 - losowy_offset)
        dni = max(-sl * 0.5, min(sl * 1.5, dni))

        p_waste = _prawd_marnotrawstwa(kat, dni)
        wasted = 1 if random.random() < p_waste else 0

        ilosc_znorm = random.uniform(0.1, 1.0)

        wiersze.append({
            "kategoria": kat,
            "dni_do_konca": round(dni, 1),
            "shelf_life": sl,
            "nietrwalosc": NIETRWALOSC[kat],
            "ilosc_znorm": round(ilosc_znorm, 2),
            "wasted": wasted,
        })

    out = DATA_DIR / "training_data.csv"
    with open(out, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=wiersze[0].keys())
        w.writeheader()
        w.writerows(wiersze)

    wasted_count = sum(r["wasted"] for r in wiersze)
    print(f"Zapisano {len(wiersze)} próbek do {out}")
    print(f"Zmarnowane: {wasted_count} ({wasted_count/len(wiersze)*100:.1f}%)")


if __name__ == "__main__":
    generuj()
