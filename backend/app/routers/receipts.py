from fastapi import APIRouter, Depends, HTTPException, UploadFile

from ..auth import get_current_user
from ..db import get_session
from ..models import User
from ..services.ocr_llm import ClaudeReceiptService
from sqlmodel import Session

router = APIRouter(prefix="/api/paragony", tags=["paragony"])


@router.post("/zaladuj")
async def zaladuj(
    file: UploadFile,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    image = await file.read()
    try:
        service = ClaudeReceiptService()
        return service.extract(image)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Błąd odczytu paragonu: {e}")
