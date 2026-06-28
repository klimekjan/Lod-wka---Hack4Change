import os
from sqlalchemy import event, text
from sqlmodel import SQLModel, create_engine, Session

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./lodowka.db")

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
)


@event.listens_for(engine, "connect")
def _set_sqlite_pragma(conn, _):
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=5000")
    conn.execute("PRAGMA synchronous=NORMAL")


# Kolumny dodane po pierwszym wdrozeniu — create_all nie aktualizuje istniejacych tabel,
# wiec dokladamy je recznie przez ALTER TABLE (idempotentnie, tylko brakujace).
_MIGRACJE = {
    "users": [
        ("address", "TEXT"),
        ("lat", "FLOAT"),
        ("lon", "FLOAT"),
        ("first_name", "TEXT"),
        ("last_name", "TEXT"),
        ("nick", "TEXT"),
        ("notify_push", "INTEGER DEFAULT 1"),
        ("notify_email", "INTEGER DEFAULT 1"),
        ("notify_days_before", "INTEGER DEFAULT 3"),
        ("notify_hour", "INTEGER DEFAULT 8"),
    ],
    "share_listings": [("address", "TEXT"), ("lat", "FLOAT"), ("lon", "FLOAT")],
    "pantry_items": [("event_id", "INTEGER"), ("image_url", "TEXT")],
    "consumption_logs": [("days_left_at_log", "INTEGER")],
}


def _dodaj_brakujace_kolumny() -> None:
    with engine.begin() as conn:
        for tabela, kolumny in _MIGRACJE.items():
            rows = conn.execute(text(f"PRAGMA table_info({tabela})")).all()
            istniejace = {row[1] for row in rows}
            for nazwa, typ in kolumny:
                if nazwa not in istniejace:
                    conn.execute(text(f"ALTER TABLE {tabela} ADD COLUMN {nazwa} {typ}"))


def init_db() -> None:
    SQLModel.metadata.create_all(engine)
    _dodaj_brakujace_kolumny()


def get_session():
    with Session(engine) as session:
        yield session
