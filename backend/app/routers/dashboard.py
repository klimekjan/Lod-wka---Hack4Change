from datetime import datetime, timedelta, timezone
from typing import List
from zoneinfo import ZoneInfo
import os

WARSZAWA = ZoneInfo("Europe/Warsaw")


def _data_warsaw(dt: datetime):
    """Konwertuje naiwny UTC datetime (z bazy) na datę w strefie Warsaw."""
    return dt.replace(tzinfo=timezone.utc).astimezone(WARSZAWA).date()

import pandas as pd
from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from ..db import get_session
from ..models import ConsumptionLog, User
from ..auth import get_current_user
from ..schemas import DashboardStats

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "data")

_WAGA_SZT: dict[str, float] = {
    "nabiał":            0.15,
    "mięso surowe":      0.20,
    "ryby":              0.15,
    "warzywa liściaste": 0.12,
    "warzywa twarde":    0.15,
    "owoce":             0.15,
    "pieczywo":          0.08,
    "jajka":             0.06,
    "napoje":            0.33,
    "przetwory":         0.35,
    "inne":              0.15,
}

_WAGA_OPAK: dict[str, float] = {
    "nabiał":            0.50,
    "mięso surowe":      0.35,
    "ryby":              0.25,
    "warzywa liściaste": 0.20,
    "warzywa twarde":    0.40,
    "owoce":             0.50,
    "pieczywo":          0.45,
    "jajka":             0.60,
    "napoje":            0.75,
    "przetwory":         0.40,
    "inne":              0.30,
}


def _szacuj_kg(quantity: float, unit: str, category: str = "inne") -> float:
    u = unit.strip().lower()
    if u == "kg":    return quantity
    if u == "g":     return quantity * 0.001
    if u == "dag":   return quantity * 0.01
    if u == "l":     return quantity
    if u == "ml":    return quantity * 0.001
    if u == "szt.":  return quantity * _WAGA_SZT.get(category, 0.15)
    if u == "opak.": return quantity * _WAGA_OPAK.get(category, 0.30)
    return quantity * 0.15


def _wczytaj_impact() -> pd.DataFrame:
    path = os.path.join(DATA_DIR, "impact_factors.csv")
    return pd.read_csv(path).set_index("kategoria")

_IMPACT: pd.DataFrame = _wczytaj_impact()


@router.get("", response_model=DashboardStats)
def pobierz_dashboard(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    logi = session.exec(
        select(ConsumptionLog).where(ConsumptionLog.user_id == current_user.id)
    ).all()

    impact = _IMPACT

    def wspolczynniki(kategoria: str) -> tuple[float, float]:
        if kategoria in impact.index:
            row = impact.loc[kategoria]
            return float(row["co2_kg_per_kg"]), float(row["cena_pln_per_kg"])
        return 1.0, 8.0

    kg_uratowane = 0.0
    kg_zmarnowane = 0.0
    kg_oddane = 0.0
    co2_unikniete = 0.0
    zl_zaoszczedzone = 0.0
    liczba_uratowan = 0
    kg_na_styk = 0.0

    for log in logi:
        kg = log.weight_kg if log.weight_kg else _szacuj_kg(log.quantity, log.unit, log.category)
        co2_f, cena_f = wspolczynniki(log.category)

        if log.action in ("eaten", "shared"):
            kg_uratowane += kg
            co2_unikniete += kg * co2_f
            zl_zaoszczedzone += kg * cena_f
            if log.action == "shared":
                kg_oddane += kg
            if log.days_left_at_log is not None and log.days_left_at_log <= 2:
                liczba_uratowan += 1
                kg_na_styk += kg
        elif log.action == "wasted":
            kg_zmarnowane += kg

    total_kg = kg_uratowane + kg_zmarnowane
    wskaznik = round(100.0 * kg_uratowane / total_kg, 1) if total_kg > 0 else 0.0

    streak = _oblicz_streak(logi)
    tygodniowe = _dane_tygodniowe(logi)

    return DashboardStats(
        kg_uratowane=round(kg_uratowane, 2),
        kg_zmarnowane=round(kg_zmarnowane, 2),
        kg_oddane=round(kg_oddane, 2),
        zl_zaoszczedzone=round(zl_zaoszczedzone, 2),
        co2_unikniete=round(co2_unikniete, 2),
        streak_dni=streak,
        wskaznik_uratowania=wskaznik,
        liczba_uratowan=liczba_uratowan,
        kg_na_styk=round(kg_na_styk, 2),
        tygodniowe=tygodniowe,
    )


def _oblicz_streak(logi: list) -> int:
    if not logi:
        return 0
    pierwsza_akcja = min(_data_warsaw(log.logged_at) for log in logi)
    dni_z_marnotrawstwem = {
        _data_warsaw(log.logged_at) for log in logi if log.action == "wasted"
    }
    streak = 0
    dzien = datetime.now(WARSZAWA).date()
    while dzien not in dni_z_marnotrawstwem and dzien >= pierwsza_akcja:
        streak += 1
        dzien -= timedelta(days=1)
    return streak


def _dane_tygodniowe(logi: list) -> List[dict]:
    dni = [(datetime.now(WARSZAWA) - timedelta(days=i)).date() for i in range(6, -1, -1)]
    okno = set(dni)

    kubelki: dict = {d: {"uratowane": 0.0, "zmarnowane": 0.0} for d in dni}
    for log in logi:
        d = _data_warsaw(log.logged_at)
        if d not in okno:
            continue
        kg = log.weight_kg or _szacuj_kg(log.quantity, log.unit, log.category)
        if log.action in ("eaten", "shared"):
            kubelki[d]["uratowane"] += kg
        elif log.action == "wasted":
            kubelki[d]["zmarnowane"] += kg

    return [
        {
            "dzien": d.strftime("%d.%m"),
            "uratowane": round(kubelki[d]["uratowane"], 2),
            "zmarnowane": round(kubelki[d]["zmarnowane"], 2),
        }
        for d in dni
    ]
