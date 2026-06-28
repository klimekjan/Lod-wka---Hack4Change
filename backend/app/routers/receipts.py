import os

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from sqlmodel import Session

from ..auth import get_current_user
from ..db import get_session
from ..models import User
from ..services.ocr_llm import ClaudeReceiptService

router = APIRouter(prefix="/api/paragony", tags=["paragony"])


@router.post("/zaladuj")
async def zaladuj(
    file: UploadFile,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    if not os.getenv("ANTHROPIC_API_KEY"):
        raise HTTPException(status_code=503, detail="ANTHROPIC_API_KEY nie ustawiony")
    image = await file.read()
    try:
        service = ClaudeReceiptService()
        return await service.extract(image)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Błąd odczytu paragonu: {e}")
