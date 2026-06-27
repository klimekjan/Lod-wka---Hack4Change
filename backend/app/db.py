from sqlalchemy import text
from sqlmodel import SQLModel, create_engine, Session

DATABASE_URL = "sqlite:///./lodowka.db"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
)


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
        ("email_verified", "INTEGER DEFAULT 0 NOT NULL"),
        ("verification_token", "TEXT"),
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
