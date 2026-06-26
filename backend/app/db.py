from sqlalchemy import text
from sqlmodel import SQLModel, create_engine, Session
from sqlalchemy.pool import StaticPool

DATABASE_URL = "sqlite:///./lodowka.db"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
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
    ],
    "share_listings": [("address", "TEXT"), ("lat", "FLOAT"), ("lon", "FLOAT")],
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
