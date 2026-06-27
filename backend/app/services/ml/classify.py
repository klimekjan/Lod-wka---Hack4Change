from pathlib import Path

MODELS_DIR = Path(__file__).parent.parent.parent.parent / "models"
_PROG = 0.32

_clf = None
_loaded = False

_KW_FALLBACK: dict[str, str] = {
    "mleko": "nabiał", "ser": "nabiał", "jogurt": "nabiał", "masło": "nabiał",
    "śmietana": "nabiał", "kefir": "nabiał", "maślanka": "nabiał", "twaróg": "nabiał",
    "mozzarella": "nabiał", "ricotta": "nabiał", "parmezan": "nabiał",
    "kurczak": "mięso surowe", "wołowina": "mięso surowe", "wieprzowina": "mięso surowe",
    "indyk": "mięso surowe", "mielone": "mięso surowe", "schab": "mięso surowe",
    "żeberka": "mięso surowe", "boczek": "mięso surowe", "polędwica": "mięso surowe",
    "łosoś": "ryby", "tuńczyk": "ryby", "makrela": "ryby", "pstrąg": "ryby",
    "dorsz": "ryby", "śledź": "ryby", "ryba": "ryby", "krewetki": "ryby",
    "sałata": "warzywa liściaste", "szpinak": "warzywa liściaste",
    "rukola": "warzywa liściaste", "jarmuż": "warzywa liściaste",
    "marchew": "warzywa twarde", "ziemniak": "warzywa twarde", "papryka": "warzywa twarde",
    "pomidor": "warzywa twarde", "ogórek": "warzywa twarde", "brokuł": "warzywa twarde",
    "cebula": "warzywa twarde", "burak": "warzywa twarde", "kalafior": "warzywa twarde",
    "jabłko": "owoce", "banan": "owoce", "pomarańcza": "owoce", "truskawka": "owoce",
    "winogrono": "owoce", "kiwi": "owoce", "mango": "owoce", "borówka": "owoce",
    "chleb": "pieczywo", "bułka": "pieczywo", "bagietka": "pieczywo",
    "tost": "pieczywo", "chałka": "pieczywo", "pumpernikiel": "pieczywo",
    "jajko": "jajka", "jajka": "jajka", "jaja": "jajka",
    "sok": "napoje", "woda": "napoje", "herbata": "napoje", "kawa": "napoje",
    "napój": "napoje", "cola": "napoje", "energia": "napoje",
    "dżem": "przetwory", "konserwa": "przetwory", "puszka": "przetwory",
    "marynata": "przetwory", "ogórki kiszone": "przetwory", "pesto": "przetwory",
    "koncentrat": "przetwory",
}


def _zaladuj() -> None:
    global _clf, _loaded
    if _loaded:
        return
    _loaded = True
    model_path = MODELS_DIR / "kategoria_clf.joblib"
    if not model_path.exists():
        print("[ML] Brak kategoria_clf.joblib — keyword-fallback aktywny. "
              "Uruchom: python -m app.services.ml.train_classifier")
        return
    try:
        import joblib
        _clf = joblib.load(model_path)
        print(f"[ML] Klasyfikator kategorii wczytany: {model_path}")
    except Exception as e:
        print(f"[ML] Błąd wczytywania klasyfikatora: {e}")


def init_classifier() -> None:
    _zaladuj()


def klasyfikuj(nazwa: str) -> tuple[str, float]:
    from .text_clean import czysc_tekst

    if _clf is None:
        naz = nazwa.lower()
        for kw, kat in _KW_FALLBACK.items():
            if kw in naz:
                return kat, 0.7
        return "inne", 0.0

    try:
        czysty = czysc_tekst(nazwa)
        proba = _clf.predict_proba([czysty])[0]
        idx = int(proba.argmax())
        pewnosc = float(proba[idx])
        kategoria = str(_clf.classes_[idx])
        if pewnosc < _PROG:
            return "inne", round(pewnosc, 3)
        return kategoria, round(pewnosc, 3)
    except Exception:
        return "inne", 0.0
