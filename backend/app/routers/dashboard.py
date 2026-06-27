from datetime import datetime, timedelta
from typing import List
import os

import pandas as pd
from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from ..db import get_session
from ..models import ConsumptionLog, User
from ..auth import get_current_user
from ..schemas import DashboardStats

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "data")

_UNIT_TO_KG: dict[str, float] = {
    "kg": 1.0,
    "g": 0.001,
    "dag": 0.01,
    "l": 1.0,
    "ml": 0.001,
    "szt.": 0.15,
    "opak.": 0.3,
}


def _szacuj_kg(quantity: float, unit: str) -> float:
    return quantity * _UNIT_TO_KG.get(unit.strip().lower(), 0.15)


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

    def wspolczynniki(kategoria: str):
        if kategoria in impact.index:
            row = impact.loc[kategoria]
            return float(row["co2_kg_per_kg"]), float(row["cena_pln_per_kg"])
        return 1.0, 8.0

    kg_uratowane = 0.0
    kg_zmarnowane = 0.0
    zl_zaoszcz = 0.0
    co2_unikniete = 0.0

    for log in logi:
        kg = log.weight_kg if log.weight_kg else _szacuj_kg(log.quantity, log.unit)
        co2_f, cena_f = wspolczynniki(log.category)
        if log.action == "eaten":
            kg_uratowane += kg
            zl_zaoszcz += kg * cena_f
            co2_unikniete += kg * co2_f
        else:
            kg_zmarnowane += kg

    # Streak - ile dni pod rzad bez "wasted" (liczone od założenia konta)
    streak = _oblicz_streak(logi, current_user.created_at)

    # Dane tygodniowe (ostatnie 7 dni)
    tygodniowe = _dane_tygodniowe(logi, _IMPACT)

    return DashboardStats(
        kg_uratowane=round(kg_uratowane, 2),
        kg_zmarnowane=round(kg_zmarnowane, 2),
        zl_zaoszczedzone=round(zl_zaoszcz, 2),
        co2_unikniete=round(co2_unikniete, 2),
        streak_dni=streak,
        tygodniowe=tygodniowe,
    )


def _oblicz_streak(logi: list, user_created_at: datetime) -> int:
    # "Dni bez marnowania" — liczone wstecz od dziś do daty rejestracji, do pierwszego dnia
    # z wpisem "wasted". Brak logów = brak marnowania → spójnie liczymy dni od rejestracji
    # (bez wczesnego return 0, ktory tworzyl niespojnosc wzgledem usera z samym "eaten").
    dni_z_marnotrawstwem = {
        log.logged_at.date() for log in logi if log.action == "wasted"
    }
    poczatek = user_created_at.date()
    streak = 0
    dzien = datetime.utcnow().date()
    while dzien not in dni_z_marnotrawstwem and dzien >= poczatek:
        streak += 1
        dzien -= timedelta(days=1)
    return streak


def _dane_tygodniowe(logi: list, impact: pd.DataFrame) -> List[dict]:
    dni = [(datetime.utcnow() - timedelta(days=i)).date() for i in range(6, -1, -1)]
    okno = set(dni)

    # Jeden przebieg po logach zamiast 7 filtrowań całości.
    kubelki: dict = {d: {"uratowane": 0.0, "zmarnowane": 0.0} for d in dni}
    for l in logi:
        d = l.logged_at.date()
        if d not in okno:
            continue
        kg = l.weight_kg or _szacuj_kg(l.quantity, l.unit)
        if l.action == "eaten":
            kubelki[d]["uratowane"] += kg
        elif l.action == "wasted":
            kubelki[d]["zmarnowane"] += kg

    return [
        {
            "dzien": d.strftime("%d.%m"),
            "uratowane": round(kubelki[d]["uratowane"], 2),
            "zmarnowane": round(kubelki[d]["zmarnowane"], 2),
        }
        for d in dni
    ]
