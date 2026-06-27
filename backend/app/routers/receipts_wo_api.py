from fastapi import APIRouter, Depends, HTTPException, UploadFile
from sqlmodel import Session

from ..auth import get_current_user
from ..db import get_session
from ..models import User
from ..services.ocr_wo_api import ocr_custom

router = APIRouter(prefix="/api/paragony_wo_api", tags=["paragony_wo_api"])

@router.post("/zaladuj")
async def zaladuj(
    file: UploadFile,
    #current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    image = await file.read()
    
    try:
        receipt = ocr_custom(image)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LLM-powered receipt converter failed: {str(e)}")
        
    return receipt