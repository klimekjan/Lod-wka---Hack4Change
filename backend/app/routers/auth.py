import secrets

from email_validator import EmailNotValidError, validate_email
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import Session, select

from ..db import get_session
from ..limiter import limiter
from ..models import User
from ..auth import hash_password, verify_password, create_access_token, get_current_user
from ..schemas import RejestrujRequest, TokenResponse, UserResponse, UstawieniaRequest
from ..services.geocoding import geokoduj_szczegolowo
from ..services.notifications import wyslij_weryfikacje_email

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/rejestruj", response_model=TokenResponse, status_code=201)
def rejestruj(dane: RejestrujRequest, session: Session = Depends(get_session)):
    # Sprawdzenie MX — czy domena może odbierać maile
    try:
        validate_email(dane.email, check_deliverability=True)
    except EmailNotValidError:
        raise HTTPException(status_code=400, detail="Adres email jest nieprawidłowy lub domena nie obsługuje poczty")

    if session.exec(select(User).where(User.email == dane.email)).first():
        raise HTTPException(status_code=400, detail="Nie można zarejestrować konta z podanymi danymi")
    if dane.nick and session.exec(select(User).where(User.nick == dane.nick)).first():
        raise HTTPException(status_code=400, detail="Nie można zarejestrować konta z podanymi danymi")

    lat, lon, miasto = None, None, None
    if dane.adres:
        wynik = geokoduj_szczegolowo(dane.adres)
        if wynik:
            lat, lon, miasto = wynik

    token = secrets.token_urlsafe(32)
    user = User(
        email=dane.email,
        password_hash=hash_password(dane.haslo),
        first_name=dane.imie,
        last_name=dane.nazwisko,
        nick=dane.nick,
        city=miasto,
        address=dane.adres,
        lat=lat,
        lon=lon,
        email_verified=False,
        verification_token=token,
    )
    session.add(user)
    session.commit()
    session.refresh(user)

    # Wysyłamy asynchronicznie w tle — nie blokujemy rejestracji gdy email nie działa
    wyslij_weryfikacje_email(user.email, token)

    return TokenResponse(access_token=create_access_token(user.id))


@router.get("/weryfikuj")
def weryfikuj_email(token: str, session: Session = Depends(get_session)):
    user = session.exec(select(User).where(User.verification_token == token)).first()
    if not user:
        raise HTTPException(status_code=400, detail="Nieprawidłowy lub wygasły token weryfikacyjny")
    user.email_verified = True
    user.verification_token = None
    session.add(user)
    session.commit()
    return {"ok": True, "message": "Email zweryfikowany pomyślnie"}


@router.post("/wyslij-weryfikacje")
def wyslij_ponownie(current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    if current_user.email_verified:
        raise HTTPException(status_code=400, detail="Email jest już zweryfikowany")
    token = secrets.token_urlsafe(32)
    current_user.verification_token = token
    session.add(current_user)
    session.commit()
    wyslij_weryfikacje_email(current_user.email, token)
    return {"ok": True}


@router.post("/login", response_model=TokenResponse)
@limiter.limit("10/minute")
def login(
    request: Request,
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
    if dane.imie is not None:
        current_user.first_name = dane.imie
    if dane.nazwisko is not None:
        current_user.last_name = dane.nazwisko
    if dane.nick is not None and dane.nick != current_user.nick:
        zajety = session.exec(select(User).where(User.nick == dane.nick)).first()
        if zajety:
            raise HTTPException(status_code=400, detail="Ten nick jest już zajęty")
        current_user.nick = dane.nick
    if dane.miasto is not None:
        current_user.city = dane.miasto
    if dane.adres is not None and dane.adres != current_user.address:
        current_user.address = dane.adres
        wynik = geokoduj_szczegolowo(dane.adres)
        if wynik:
            current_user.lat, current_user.lon, miasto = wynik
            if miasto:
                current_user.city = miasto
        else:
            current_user.lat = None
            current_user.lon = None
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
        imie=user.first_name,
        nazwisko=user.last_name,
        nick=user.nick,
        miasto=user.city,
        adres=user.address,
        lat=user.lat,
        lon=user.lon,
        notify_push=user.notify_push,
        notify_email=user.notify_email,
        notify_days_before=user.notify_days_before,
        notify_hour=user.notify_hour,
        created_at=user.created_at,
        email_verified=user.email_verified,
    )
