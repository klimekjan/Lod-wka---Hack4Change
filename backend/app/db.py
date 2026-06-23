from sqlmodel import SQLModel, create_engine, Session
from sqlalchemy.pool import StaticPool

DATABASE_URL = "sqlite:///./lodowka.db"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)


def init_db() -> None:
    SQLModel.metadata.create_all(engine)


def get_session():
    with Session(engine) as session:
        yield session
