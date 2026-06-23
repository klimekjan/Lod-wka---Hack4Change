from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlmodel import Session

from .db import engine
from .services.notifications import sprawdz_terminy

scheduler = AsyncIOScheduler(timezone="Europe/Warsaw")


def _job() -> None:
    with Session(engine) as session:
        n = sprawdz_terminy(session)
    print(f"[scheduler] sprawdzono terminy, wysłano {n} alertów")


def start_scheduler() -> None:
    scheduler.add_job(
        _job,
        trigger=CronTrigger(hour=8, minute=0),
        id="sprawdz_terminy",
        replace_existing=True,
        misfire_grace_time=3600,
    )
    scheduler.start()
