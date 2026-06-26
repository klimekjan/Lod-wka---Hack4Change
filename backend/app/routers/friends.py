from typing import List, Set

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select, or_, and_

from ..auth import get_current_user
from ..db import get_session
from ..models import Friendship, Notification, User
from ..schemas import ProfilPublicznyResponse, ZaproszenieResponse

router = APIRouter(prefix="/api/znajomi", tags=["znajomi"])


def zbior_znajomych(session: Session, user_id: int) -> Set[int]:
    rows = session.exec(
        select(Friendship).where(
            Friendship.status == "accepted",
            or_(
                Friendship.requester_id == user_id,
                Friendship.addressee_id == user_id,
            ),
        )
    ).all()
    wynik = set()
    for r in rows:
        wynik.add(r.addressee_id if r.requester_id == user_id else r.requester_id)
    return wynik


def czy_znajomi(session: Session, a: int, b: int) -> bool:
    return bool(
        session.exec(
            select(Friendship).where(
                Friendship.status == "accepted",
                or_(
                    and_(Friendship.requester_id == a, Friendship.addressee_id == b),
                    and_(Friendship.requester_id == b, Friendship.addressee_id == a),
                ),
            )
        ).first()
    )


def _znajdz_relacje(session: Session, a: int, b: int):
    return session.exec(
        select(Friendship).where(
            or_(
                and_(Friendship.requester_id == a, Friendship.addressee_id == b),
                and_(Friendship.requester_id == b, Friendship.addressee_id == a),
            )
        )
    ).first()


def _status_dla(session: Session, moje_id: int, innych_id: int) -> str:
    rel = _znajdz_relacje(session, moje_id, innych_id)
    if not rel:
        return "brak"
    if rel.status == "accepted":
        return "znajomy"
    if rel.requester_id == moje_id:
        return "wyslane"
    return "oczekuje"


def _profil(user: User, status: str) -> ProfilPublicznyResponse:
    return ProfilPublicznyResponse(
        id=user.id,
        imie=user.first_name,
        nazwisko=user.last_name,
        nick=user.nick,
        status_znajomosci=status,
    )


@router.get("/szukaj", response_model=List[ProfilPublicznyResponse])
def szukaj_uzytkownikow(
    q: str = "",
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    if not q or len(q) < 2:
        return []
    wzorzec = f"%{q}%"
    users = session.exec(
        select(User).where(
            User.id != current_user.id,
            or_(
                User.first_name.ilike(wzorzec),
                User.last_name.ilike(wzorzec),
                User.nick.ilike(wzorzec),
            ),
        ).limit(20)
    ).all()
    return [_profil(u, _status_dla(session, current_user.id, u.id)) for u in users]


@router.get("", response_model=List[ProfilPublicznyResponse])
def lista_znajomych(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    ids = zbior_znajomych(session, current_user.id)
    if not ids:
        return []
    users = session.exec(select(User).where(User.id.in_(ids))).all()
    return [_profil(u, "znajomy") for u in users]


@router.get("/zaproszenia", response_model=List[ZaproszenieResponse])
def lista_zaproszen(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    zaproszenia = session.exec(
        select(Friendship).where(
            Friendship.addressee_id == current_user.id,
            Friendship.status == "pending",
        ).order_by(Friendship.created_at.desc())
    ).all()
    wynik = []
    for z in zaproszenia:
        requester = session.get(User, z.requester_id)
        wynik.append(ZaproszenieResponse(
            id=z.id,
            requester_id=z.requester_id,
            addressee_id=z.addressee_id,
            status=z.status,
            created_at=z.created_at,
            profil=_profil(requester, "oczekuje") if requester else None,
        ))
    return wynik


@router.get("/zaproszenia/licznik", response_model=dict)
def licznik_zaproszen(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    count = len(session.exec(
        select(Friendship).where(
            Friendship.addressee_id == current_user.id,
            Friendship.status == "pending",
        )
    ).all())
    return {"count": count}


@router.post("/zapros/{user_id}", response_model=ZaproszenieResponse, status_code=201)
def wyslij_zaproszenie(
    user_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Nie możesz zaprosić siebie")
    adresat = session.get(User, user_id)
    if not adresat:
        raise HTTPException(status_code=404, detail="Użytkownik nie znaleziony")
    istniejaca = _znajdz_relacje(session, current_user.id, user_id)
    if istniejaca:
        raise HTTPException(status_code=409, detail="Relacja już istnieje")
    zaproszenie = Friendship(requester_id=current_user.id, addressee_id=user_id)
    session.add(zaproszenie)
    imie_nadawcy = f"{current_user.first_name or ''} {current_user.last_name or ''}".strip() or current_user.nick or current_user.email
    powiadomienie = Notification(
        user_id=user_id,
        type="friend_request",
        message=f"{imie_nadawcy} wysłał(a) Ci zaproszenie do znajomych",
    )
    session.add(powiadomienie)
    session.commit()
    session.refresh(zaproszenie)
    return ZaproszenieResponse(
        id=zaproszenie.id,
        requester_id=zaproszenie.requester_id,
        addressee_id=zaproszenie.addressee_id,
        status=zaproszenie.status,
        created_at=zaproszenie.created_at,
        profil=_profil(adresat, "wyslane"),
    )


@router.post("/{friendship_id}/akceptuj", response_model=ZaproszenieResponse)
def akceptuj_zaproszenie(
    friendship_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    zaproszenie = session.get(Friendship, friendship_id)
    if not zaproszenie or zaproszenie.addressee_id != current_user.id:
        raise HTTPException(status_code=404, detail="Zaproszenie nie znalezione")
    if zaproszenie.status != "pending":
        raise HTTPException(status_code=409, detail="Zaproszenie już przetworzone")
    zaproszenie.status = "accepted"
    session.add(zaproszenie)
    notif = session.exec(
        select(Notification).where(
            Notification.user_id == current_user.id,
            Notification.type == "friend_request",
            Notification.read == False,
        )
    ).first()
    if notif:
        notif.read = True
        session.add(notif)
    session.commit()
    session.refresh(zaproszenie)
    requester = session.get(User, zaproszenie.requester_id)
    return ZaproszenieResponse(
        id=zaproszenie.id,
        requester_id=zaproszenie.requester_id,
        addressee_id=zaproszenie.addressee_id,
        status=zaproszenie.status,
        created_at=zaproszenie.created_at,
        profil=_profil(requester, "znajomy") if requester else None,
    )


@router.post("/{friendship_id}/odrzuc", status_code=204)
def odrzuc_zaproszenie(
    friendship_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    zaproszenie = session.get(Friendship, friendship_id)
    if not zaproszenie or zaproszenie.addressee_id != current_user.id:
        raise HTTPException(status_code=404, detail="Zaproszenie nie znalezione")
    session.delete(zaproszenie)
    notif = session.exec(
        select(Notification).where(
            Notification.user_id == current_user.id,
            Notification.type == "friend_request",
            Notification.read == False,
        )
    ).first()
    if notif:
        notif.read = True
        session.add(notif)
    session.commit()


@router.delete("/{user_id}", status_code=204)
def usun_znajomego(
    user_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    rel = _znajdz_relacje(session, current_user.id, user_id)
    if not rel:
        raise HTTPException(status_code=404, detail="Relacja nie znaleziona")
    session.delete(rel)
    session.commit()
