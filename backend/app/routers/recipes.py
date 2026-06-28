import json
import logging
import os

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlmodel import Session, select

from ..auth import get_current_user
from ..db import get_session
from ..limiter import limiter
from ..models import PantryItem, RecipeCache, User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/przepisy", tags=["przepisy"])


def _cache_response(cache: RecipeCache | None) -> dict:
    if not cache:
        return {"przepisy": [], "created_at": None}
    return {
        "przepisy": json.loads(cache.recipes_json),
        "created_at": cache.created_at.isoformat(),
    }


@router.get("")
def pobierz(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Zwraca zapisane przepisy (bez wywołania AI)."""
    cache = session.exec(
        select(RecipeCache).where(RecipeCache.user_id == current_user.id)
    ).first()
    return _cache_response(cache)


@router.post("/generuj")
@limiter.limit("5/minute")
async def generuj(
    request: Request,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Generuje nowe przepisy przez Claude i zapisuje w cache."""
    if not os.getenv("ANTHROPIC_API_KEY"):
        raise HTTPException(status_code=503, detail="ANTHROPIC_API_KEY nie ustawiony")

    produkty = session.exec(
        select(PantryItem).where(
            PantryItem.user_id == current_user.id,
            PantryItem.status == "active",
        )
    ).all()

    if not produkty:
        return {"przepisy": [], "created_at": None, "info": "Spiżarnia jest pusta"}

    from ..services.recipes import generuj_przepisy
    try:
        przepisy = await generuj_przepisy(list(produkty))
    except Exception:
        logger.exception("Błąd generowania przepisów")
        raise HTTPException(status_code=502, detail="Błąd generowania przepisów")

    recipes_json = json.dumps(przepisy, ensure_ascii=False)

    cache = session.exec(
        select(RecipeCache).where(RecipeCache.user_id == current_user.id)
    ).first()

    if cache:
        cache.recipes_json = recipes_json
        from datetime import datetime
        cache.created_at = datetime.utcnow()
    else:
        cache = RecipeCache(user_id=current_user.id, recipes_json=recipes_json)
        session.add(cache)

    session.commit()
    session.refresh(cache)
    return _cache_response(cache)
