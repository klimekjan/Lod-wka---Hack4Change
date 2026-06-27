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
    session: Session = Depends(get_session) 
):
    image = await file.read()

    try: 
        service = ClaudeReceiptService()
        receipt = service.extract(image)
    except Exception as e:
        raise HTTPException(500, f"LLM-powered receipt converter failed: {str(e)}")

    return receipt