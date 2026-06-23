import os

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from ..auth import get_current_user
from ..db import get_session
from ..models import PantryItem, User

router = APIRouter(prefix="/api/przepisy", tags=["przepisy"])


@router.get("/generuj")
async def generuj(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    if not os.getenv("ANTHROPIC_API_KEY"):
        raise HTTPException(status_code=503, detail="ANTHROPIC_API_KEY nie ustawiony")

    produkty = session.exec(
        select(PantryItem).where(
            PantryItem.user_id == current_user.id,
            PantryItem.status == "active",
        )
    ).all()

    if not produkty:
        return {"przepisy": [], "info": "Spiżarnia jest pusta"}

    from ..services.recipes import generuj_przepisy
    try:
        przepisy = await generuj_przepisy(list(produkty))
        return {"przepisy": przepisy}
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Claude API: {exc}")
