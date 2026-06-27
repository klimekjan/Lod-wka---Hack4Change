import os
from pathlib import Path
from typing import Optional

MODELS_DIR = Path(__file__).parent.parent.parent.parent / "models"
_model = None
_model_loaded = False


def _zaladuj_model():
    global _model, _model_loaded
    if _model_loaded:
        return
    _model_loaded = True
    model_path = MODELS_DIR / "waste_risk.joblib"
    if not model_path.exists():
        print("[ML] Brak modelu waste_risk.joblib — używam heurystyki. Uruchom: python -m app.services.ml.train")
        return
    try:
        import joblib
        _model = joblib.load(model_path)
        print(f"[ML] Model wczytany: {model_path}")
    except Exception as e:
        print(f"[ML] Błąd wczytywania modelu: {e}")


def init_models() -> None:
    """Wywołaj przy starcie aplikacji."""
    _zaladuj_model()


def przewiduj_ryzyko(
    kategoria: str,
    dni_do_konca: Optional[float],
    shelf_life_dni: Optional[int] = None,
    ilosc_znorm: float = 0.5,
) -> float:
    """Zwraca prawdopodobieństwo zmarnowania (0.0–1.0)."""
    from .features import cechy, ryzyko_heurystyczne

    if _model is None:
        return ryzyko_heurystyczne(kategoria, dni_do_konca)

    try:
        import numpy as np
        x = np.array([cechy(kategoria, dni_do_konca, shelf_life_dni, ilosc_znorm)])
        prob = float(_model.predict_proba(x)[0][1])
        return round(prob, 3)
    except Exception:
        from .features import ryzyko_heurystyczne
        return ryzyko_heurystyczne(kategoria, dni_do_konca)


def przewiduj_ryzyko_batch(wejscia: list[dict]) -> list[float]:
    """Batch wersja `przewiduj_ryzyko` — jedna predykcja zamiast N osobnych.

    Każde wejście: {kategoria, dni_do_konca, shelf_life_dni, ilosc_znorm}.
    """
    from .features import cechy, ryzyko_heurystyczne

    if not wejscia:
        return []

    if _model is None:
        return [ryzyko_heurystyczne(w["kategoria"], w["dni_do_konca"]) for w in wejscia]

    try:
        import numpy as np
        X = np.array([
            cechy(w["kategoria"], w["dni_do_konca"], w.get("shelf_life_dni"), w.get("ilosc_znorm", 0.5))
            for w in wejscia
        ])
        probs = _model.predict_proba(X)[:, 1]
        return [round(float(p), 3) for p in probs]
    except Exception:
        from .features import ryzyko_heurystyczne
        return [ryzyko_heurystyczne(w["kategoria"], w["dni_do_konca"]) for w in wejscia]


def przewiduj_koniec_zapasow(
    kategoria: str,
    ilosc: float,
    historyczne_zuzycie_dziennie: Optional[float] = None,
) -> Optional[int]:
    """Szacuje ile dni zajmie zużycie danego produktu. None = nie wiadomo."""
    from .features import SHELF_LIFE_DNI

    if historyczne_zuzycie_dziennie and historyczne_zuzycie_dziennie > 0:
        return max(1, int(ilosc / historyczne_zuzycie_dziennie))

    # Fallback: typowe tempo zuzycia wg kategorii
    tempo = {
        "mięso surowe": 0.5, "ryby": 0.5, "warzywa liściaste": 0.3,
        "nabiał": 0.2, "warzywa twarde": 0.15, "owoce": 0.25,
        "jajka": 0.15, "pieczywo": 0.2, "napoje": 0.15, "przetwory": 0.01, "inne": 0.1,
    }
    t = tempo.get(kategoria, 0.1)
    if t <= 0:
        return None
    return max(1, int(ilosc / t))
