import os

from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile
from sqlmodel import Session

from ..auth import get_current_user
from ..db import get_session
from ..limiter import limiter
from ..models import User
from ..services.ocr_llm import ClaudeReceiptService

router = APIRouter(prefix="/api/paragony", tags=["paragony"])

_MAX_BYTES = 5 * 1024 * 1024  # 5 MB


@router.post("/zaladuj")
@limiter.limit("5/minute")
async def zaladuj(
    request: Request,
    file: UploadFile,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    if not os.getenv("ANTHROPIC_API_KEY"):
        raise HTTPException(status_code=503, detail="ANTHROPIC_API_KEY nie ustawiony")
    if file.content_type not in ("image/jpeg", "image/png", "image/webp", "image/gif"):
        raise HTTPException(status_code=415, detail="Wymagany plik obrazu (jpg/png/webp/gif)")
    image = await file.read(_MAX_BYTES + 1)
    if len(image) > _MAX_BYTES:
        raise HTTPException(status_code=413, detail="Plik za duży (max 5 MB)")
    try:
        service = ClaudeReceiptService()
        return await service.extract(image)
    except Exception as e:
        raise HTTPException(status_code=500, detail="Błąd odczytu paragonu")
