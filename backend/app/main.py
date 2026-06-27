import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

load_dotenv()

from .db import init_db
from .limiter import limiter
from .routers import auth, pantry, notifications, dashboard, community, produkty, push, recipes, friends, events, receipts, receipts_wo_api


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    from .services.ml.predict import init_models
    init_models()
    from .services.ml.classify import init_classifier
    init_classifier()
    from .scheduler import start_scheduler
    start_scheduler()
    yield


app = FastAPI(title="Lodówka API", version="0.3.0", lifespan=lifespan, redirect_slashes=False)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, "http://localhost:3000"],
    # Aplikacja uwierzytelnia przez Bearer token w naglowku, nie cookies — credentials zbedne.
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(pantry.router)
app.include_router(notifications.router)
app.include_router(dashboard.router)
app.include_router(community.router)
app.include_router(produkty.router)
app.include_router(push.router)
app.include_router(recipes.router)
app.include_router(friends.router)
app.include_router(events.router)
app.include_router(receipts.router)
app.include_router(receipts_wo_api.router)



@app.get("/api/health")
def health():
    return {"status": "ok", "version": "0.3.0"}
