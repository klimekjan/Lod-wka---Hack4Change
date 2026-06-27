import json
import os
import smtplib
from datetime import datetime, timedelta
from email.mime.text import MIMEText
from typing import Optional

from sqlmodel import Session, select

from ..models import Notification, PantryItem, PushSubscription, User


def _wyslij_push(sub: PushSubscription, payload: dict) -> bool:
    vapid_key = os.getenv("VAPID_PRIVATE_KEY")
    vapid_email = os.getenv("VAPID_EMAIL", "mailto:admin@example.com")
    if not vapid_key:
        return False
    try:
        from pywebpush import WebPushException, webpush
        webpush(
            subscription_info={
                "endpoint": sub.endpoint,
                "keys": {"p256dh": sub.p256dh, "auth": sub.auth},
            },
            data=json.dumps(payload, ensure_ascii=False),
            vapid_private_key=vapid_key,
            vapid_claims={"sub": vapid_email},
        )
        return True
    except Exception:
        return False


def _wyslij_email(do: str, temat: str, tresc: str) -> bool:
    # Próbuje Resend, fallback na SMTP
    resend_key = os.getenv("RESEND_API_KEY")
    if resend_key:
        try:
            import resend
            resend.api_key = resend_key
            resend.Emails.send({
                "from": os.getenv("SMTP_FROM", "noreply@example.com"),
                "to": [do],
                "subject": temat,
                "text": tresc,
            })
            return True
        except Exception:
            pass

    smtp_host = os.getenv("SMTP_HOST")
    smtp_user = os.getenv("SMTP_USER")
    smtp_pass = os.getenv("SMTP_PASSWORD")
    smtp_from = os.getenv("SMTP_FROM", smtp_user or "")
    if not (smtp_host and smtp_user and smtp_pass):
        return False

    try:
        msg = MIMEText(tresc, "plain", "utf-8")
        msg["Subject"] = temat
        msg["From"] = smtp_from
        msg["To"] = do
        with smtplib.SMTP(smtp_host, int(os.getenv("SMTP_PORT", "587"))) as s:
            s.starttls()
            s.login(smtp_user, smtp_pass)
            s.send_message(msg)
        return True
    except Exception:
        return False


def wyslij_weryfikacje_email(email: str, token: str) -> bool:
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
    link = f"{frontend_url}/weryfikuj?token={token}"
    return _wyslij_email(
        do=email,
        temat="Eat Me App — potwierdź adres email",
        tresc=(
            f"Cześć!\n\n"
            f"Kliknij poniższy link, aby potwierdzić swój adres email:\n{link}\n\n"
            f"Jeśli nie zakładałeś konta w Eat Me App, zignoruj tę wiadomość."
        ),
    )


def sprawdz_terminy(session: Session, tylko_godzina: Optional[int] = None) -> int:
    """Sprawdza terminy ważności i wysyła powiadomienia. Zwraca liczbę wysłanych alertów.

    `tylko_godzina` — gdy podane, powiadamia tylko userów z `notify_hour == tylko_godzina`
    (używane przez scheduler odpalany co godzinę). None = wszyscy (ręczny test).
    """
    teraz = datetime.utcnow()
    wyslanych = 0
    users = session.exec(select(User)).all()

    for user in users:
        if tylko_godzina is not None and user.notify_hour != tylko_godzina:
            continue

        prog = timedelta(days=user.notify_days_before)
        granica = teraz + prog

        przeterminowane = session.exec(
            select(PantryItem).where(
                PantryItem.user_id == user.id,
                PantryItem.status == "active",
                PantryItem.expires_at <= teraz,
            )
        ).all()

        kończące = session.exec(
            select(PantryItem).where(
                PantryItem.user_id == user.id,
                PantryItem.status == "active",
                PantryItem.expires_at > teraz,
                PantryItem.expires_at <= granica,
            )
        ).all()

        # Dedup: pomijamy produkty, ktore juz maja nieprzeczytane powiadomienie expiry,
        # zeby codzienne uruchomienia nie zasypywaly listy duplikatami tego samego itemu.
        juz_powiadomione = {
            n.item_id
            for n in session.exec(
                select(Notification).where(
                    Notification.user_id == user.id,
                    Notification.type == "expiry",
                    Notification.read == False,
                )
            ).all()
        }

        nowe_alerty = []
        for item in przeterminowane:
            if item.id in juz_powiadomione:
                continue
            session.add(Notification(
                user_id=user.id,
                type="expiry",
                message=f"{item.name} jest przeterminowany!",
                item_id=item.id,
            ))
            nowe_alerty.append(item)

        for item in kończące:
            if item.id in juz_powiadomione:
                continue
            dni = (item.expires_at - teraz).days
            label = "dzień" if dni == 1 else "dni"
            session.add(Notification(
                user_id=user.id,
                type="expiry",
                message=f"{item.name} kończy się za {dni} {label}",
                item_id=item.id,
            ))
            nowe_alerty.append(item)

        if not nowe_alerty:
            continue

        wyslanych += len(nowe_alerty)
        body_push = f"{len(nowe_alerty)} produktów wymaga uwagi w spiżarni"
        body_email = "\n".join(
            [f"- {p.name}" for p in nowe_alerty]
        )

        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")

        if user.notify_push:
            subs = session.exec(
                select(PushSubscription).where(PushSubscription.user_id == user.id)
            ).all()
            for sub in subs:
                _wyslij_push(sub, {"title": "Eat Me App", "body": body_push, "url": "/"})

        if user.notify_email:
            _wyslij_email(
                do=user.email,
                temat="Eat Me App: produkty wymagają uwagi",
                tresc=f"Cześć!\n\nNastępujące produkty wymagają uwagi:\n{body_email}\n\nOtwórz aplikację: {frontend_url}",
            )

    session.commit()
    return wyslanych
