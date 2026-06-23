from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import Session, select

from ..db import get_session
from ..models import User
from ..auth import hash_password, verify_password, create_access_token, get_current_user
from ..schemas import RejestrujRequest, TokenResponse, UserResponse, UstawieniaRequest

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/rejestruj", response_model=TokenResponse, status_code=201)
def rejestruj(dane: RejestrujRequest, session: Session = Depends(get_session)):
    if session.exec(select(User).where(User.email == dane.email)).first():
        raise HTTPException(status_code=400, detail="Email juz jest zarejestrowany")
    user = User(
        email=dane.email,
        password_hash=hash_password(dane.haslo),
        city=dane.miasto,
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return TokenResponse(access_token=create_access_token(user.id))


@router.post("/login", response_model=TokenResponse)
def login(
    form: OAuth2PasswordRequestForm = Depends(),
    session: Session = Depends(get_session),
):
    user = session.exec(select(User).where(User.email == form.username)).first()
    if not user or not verify_password(form.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Nieprawidlowy email lub haslo")
    return TokenResponse(access_token=create_access_token(user.id))


@router.get("/mnie", response_model=UserResponse)
def pobierz_mnie(current_user: User = Depends(get_current_user)):
    return _user_to_response(current_user)


@router.patch("/ustawienia", response_model=UserResponse)
def aktualizuj_ustawienia(
    dane: UstawieniaRequest,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    if dane.miasto is not None:
        current_user.city = dane.miasto
    if dane.notify_push is not None:
        current_user.notify_push = dane.notify_push
    if dane.notify_email is not None:
        current_user.notify_email = dane.notify_email
    if dane.notify_days_before is not None:
        current_user.notify_days_before = dane.notify_days_before
    if dane.notify_hour is not None:
        current_user.notify_hour = dane.notify_hour
    session.add(current_user)
    session.commit()
    session.refresh(current_user)
    return _user_to_response(current_user)


def _user_to_response(user: User) -> UserResponse:
    return UserResponse(
        id=user.id,
        email=user.email,
        miasto=user.city,
        notify_push=user.notify_push,
        notify_email=user.notify_email,
        notify_days_before=user.notify_days_before,
        notify_hour=user.notify_hour,
        created_at=user.created_at,
    )
