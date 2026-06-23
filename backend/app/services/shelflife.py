import os

import pandas as pd

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "data")

_df: pd.DataFrame | None = None


def _get_df() -> pd.DataFrame:
    global _df
    if _df is None:
        _df = pd.read_csv(os.path.join(DATA_DIR, "shelf_life.csv"))
    return _df


def domyslne_dni(kategoria: str, przechowywanie: str = "lodowka") -> int:
    df = _get_df()
    row = df[df["kategoria"] == kategoria]
    if row.empty:
        row = df[df["kategoria"] == "inne"]
    col = f"dni_{przechowywanie}"
    if col in row.columns and not row.empty:
        return int(row.iloc[0][col])
    return 7
