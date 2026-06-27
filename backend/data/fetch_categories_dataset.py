"""
Pobiera dane treningowe z Open Food Facts Search API (v1 cgi/search.pl).
Uruchom PRZED trenowaniem: python data/fetch_categories_dataset.py

Wynik: data/kategorie_training.csv  (zignorowany przez git)
Trenowanie: python -m app.services.ml.train_classifier
"""
import csv
import time
from pathlib import Path

import httpx

DATA_DIR = Path(__file__).parent
OUT = DATA_DIR / "kategorie_training.csv"

OFF_SEARCH = "https://world.openfoodfacts.org/cgi/search.pl"
HEADERS = {"User-Agent": "Lodowka-App/1.0 (janklimek2008@gmail.com)"}

# Angielskie tagi OFF (z prefiksem en:) → polska kategoria
OFF_TAGS: dict[str, str] = {
    # nabiał
    "en:cheeses": "nabiał", "en:milks": "nabiał", "en:yogurts": "nabiał",
    "en:butters": "nabiał", "en:dairies": "nabiał",
    # mięso surowe
    "en:meats": "mięso surowe", "en:chicken-products": "mięso surowe",
    "en:beef-products": "mięso surowe", "en:pork": "mięso surowe",
    # ryby
    "en:fish": "ryby", "en:seafood": "ryby", "en:smoked-fish": "ryby",
    # warzywa liściaste
    "en:lettuces": "warzywa liściaste", "en:salads": "warzywa liściaste",
    "en:spinach": "warzywa liściaste",
    # warzywa twarde
    "en:vegetables": "warzywa twarde", "en:root-vegetables": "warzywa twarde",
    "en:cabbages": "warzywa twarde", "en:mushrooms": "warzywa twarde",
    # owoce
    "en:fruits": "owoce", "en:berries": "owoce", "en:citrus": "owoce",
    # pieczywo
    "en:breads": "pieczywo", "en:pastries": "pieczywo",
    "en:bakery-products": "pieczywo",
    # jajka
    "en:eggs": "jajka",
    # napoje
    "en:beverages": "napoje", "en:juices": "napoje", "en:waters": "napoje",
    "en:sodas": "napoje",
    # przetwory
    "en:canned-foods": "przetwory", "en:jams": "przetwory",
    "en:preserves": "przetwory", "en:sauces": "przetwory",
    # inne
    "en:snacks": "inne", "en:condiments": "inne", "en:cereals": "inne",
    "en:pasta": "inne",
}

PAGES_PER_TAG = 3
PAGE_SIZE = 100
SLEEP_SEC = 1.0
TIMEOUT_SEC = 30.0


def pobierz_tag(tag: str, kategoria: str, klient: httpx.Client) -> list[tuple[str, str]]:
    wyniki: list[tuple[str, str]] = []
    for page in range(1, PAGES_PER_TAG + 1):
        try:
            resp = klient.get(
                OFF_SEARCH,
                params={
                    "action": "process",
                    "tagtype_0": "categories",
                    "tag_contains_0": "contains",
                    "tag_0": tag,
                    "json": "1",
                    "page": str(page),
                    "page_size": str(PAGE_SIZE),
                    "fields": "product_name,product_name_pl",
                },
                headers=HEADERS,
                timeout=TIMEOUT_SEC,
                follow_redirects=True,
            )
            if resp.status_code != 200:
                print(f"    HTTP {resp.status_code} dla tagu '{tag}' strona {page} — pomijam")
                break
            data = resp.json()
            produkty = data.get("products", [])
        except httpx.TimeoutException:
            print(f"    Timeout dla tagu '{tag}' strona {page}")
            break
        except Exception as e:
            print(f"    Błąd dla tagu '{tag}' strona {page}: {type(e).__name__}: {e}")
            break

        if not produkty:
            break

        for p in produkty:
            nazwa = (p.get("product_name_pl") or p.get("product_name") or "").strip()
            if nazwa and len(nazwa) >= 3:
                wyniki.append((nazwa, kategoria))

        time.sleep(SLEEP_SEC)

    return wyniki


def pobierz() -> None:
    print(f"Pobieranie danych z Open Food Facts ({len(OFF_TAGS)} tagów × {PAGES_PER_TAG} stron)...")
    wiersze: list[tuple[str, str]] = []
    widziane: set[str] = set()

    with httpx.Client() as klient:
        for tag, kategoria in OFF_TAGS.items():
            print(f"  [{kategoria}] tag={tag}...")
            nowe = pobierz_tag(tag, kategoria, klient)
            for nazwa, kat in nowe:
                klucz = nazwa.lower()
                if klucz not in widziane:
                    widziane.add(klucz)
                    wiersze.append((nazwa, kat))
            print(f"    → {len(nowe)} (łącznie unikalnych: {len(wiersze)})")

    with open(OUT, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["nazwa", "kategoria"])
        w.writerows(wiersze)

    print(f"\nZapisano {len(wiersze)} próbek do {OUT}")
    from collections import Counter
    cnt = Counter(k for _, k in wiersze)
    for kat, n in sorted(cnt.items()):
        print(f"  {kat}: {n}")


if __name__ == "__main__":
    pobierz()
