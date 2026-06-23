import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

from .db import init_db
from .routers import auth, pantry, notifications, dashboard, community


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="Lodówka API", version="0.1.0", lifespan=lifespan)

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(pantry.router)
app.include_router(notifications.router)
app.include_router(dashboard.router)
app.include_router(community.router)


@app.get("/api/health")
def health():
    return {"status": "ok", "version": "0.1.0"}
