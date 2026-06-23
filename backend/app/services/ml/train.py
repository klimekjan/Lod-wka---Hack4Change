"""
Trenuje model ryzyka zmarnowania (GradientBoostingClassifier).
Uruchom: python -m app.services.ml.train  (z katalogu backend/)

Model zapisywany do: backend/models/waste_risk.joblib
"""
import os
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).parent.parent.parent.parent
DATA_DIR = BACKEND_DIR / "data"
MODELS_DIR = BACKEND_DIR / "models"


def trenuj() -> None:
    import joblib
    import pandas as pd
    from sklearn.ensemble import GradientBoostingClassifier
    from sklearn.metrics import classification_report
    from sklearn.model_selection import train_test_split

    csv_path = DATA_DIR / "training_data.csv"
    if not csv_path.exists():
        print(f"Brak {csv_path}. Generuję dane syntetyczne...")
        sys.path.insert(0, str(BACKEND_DIR))
        from data.generate_synthetic import generuj
        generuj()

    df = pd.read_csv(csv_path)

    # Feature engineering spójny z features.py
    from app.services.ml.features import KATEGORIE_IDX, NIETRWALOSC, SHELF_LIFE_DNI

    df["kat_id"] = df["kategoria"].map(lambda k: KATEGORIE_IDX.get(k, 10) / 10.0)
    df["nietrw"] = df["kategoria"].map(lambda k: NIETRWALOSC.get(k, 0.5))
    df["proporcja"] = (df["dni_do_konca"] / df["shelf_life"].clip(lower=1)).clip(-1.0, 1.5)
    df["dni_znorm"] = (df["dni_do_konca"] / 30.0).clip(-1.0, 1.0)
    ilosc_col = "ilosc_znorm" if "ilosc_znorm" in df.columns else None

    cechy = ["kat_id", "nietrw", "proporcja", "dni_znorm"]
    if ilosc_col:
        cechy.append(ilosc_col)

    X = df[cechy].values
    y = df["wasted"].values

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

    model = GradientBoostingClassifier(
        n_estimators=120,
        learning_rate=0.08,
        max_depth=4,
        subsample=0.85,
        random_state=42,
    )
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    print("\nWyniki na zbiorze testowym:")
    print(classification_report(y_test, y_pred, target_names=["zjedzone", "zmarnowane"]))

    MODELS_DIR.mkdir(exist_ok=True)
    out = MODELS_DIR / "waste_risk.joblib"
    joblib.dump(model, out)
    print(f"Model zapisany: {out}")


if __name__ == "__main__":
    trenuj()
