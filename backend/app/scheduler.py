from datetime import datetime
from zoneinfo import ZoneInfo

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlmodel import Session

from .db import engine
from .services.notifications import sprawdz_terminy

WARSZAWA = ZoneInfo("Europe/Warsaw")
scheduler = AsyncIOScheduler(timezone="Europe/Warsaw")


def _job() -> None:
    # Cron leci co godzine; powiadamiamy tylko userow, ktorych notify_hour == biezaca godzina.
    godzina = datetime.now(WARSZAWA).hour
    with Session(engine) as session:
        n = sprawdz_terminy(session, tylko_godzina=godzina)
    print(f"[scheduler] godzina {godzina:02d}:00 — sprawdzono terminy, wysłano {n} alertów")


def start_scheduler() -> None:
    scheduler.add_job(
        _job,
        trigger=CronTrigger(minute=0),
        id="sprawdz_terminy",
        replace_existing=True,
        misfire_grace_time=3600,
    )
    scheduler.start()
