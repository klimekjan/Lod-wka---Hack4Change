from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, model_validator


# --- Auth ---

class RejestrujRequest(BaseModel):
    email: EmailStr
    haslo: str
    imie: str
    nazwisko: str
    adres: Optional[str] = None
    nick: Optional[str] = None

    @model_validator(mode="after")
    def nick_wymagany_gdy_adres(self):
        if self.adres and not self.nick:
            raise ValueError("Nick jest wymagany gdy podajesz adres")
        return self


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: int
    email: str
    imie: Optional[str] = None
    nazwisko: Optional[str] = None
    nick: Optional[str] = None
    miasto: Optional[str]
    adres: Optional[str] = None
    lat: Optional[float] = None
    lon: Optional[float] = None
    notify_push: bool
    notify_email: bool
    notify_days_before: int
    notify_hour: int
    created_at: datetime
    email_verified: bool = False

    class Config:
        from_attributes = True


class UstawieniaRequest(BaseModel):
    imie: Optional[str] = None
    nazwisko: Optional[str] = None
    nick: Optional[str] = None
    miasto: Optional[str] = None
    adres: Optional[str] = None
    notify_push: Optional[bool] = None
    notify_email: Optional[bool] = None
    notify_days_before: Optional[int] = None
    notify_hour: Optional[int] = None


# --- Spizarnia ---

class DodajProduktRequest(BaseModel):
    name: str
    category: str = "inne"
    quantity: float = 1.0
    unit: str = "szt."
    barcode: Optional[str] = None
    image_url: Optional[str] = None
    expires_at: Optional[datetime] = None


class AktualizujProduktRequest(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    quantity: Optional[float] = None
    unit: Optional[str] = None
    expires_at: Optional[datetime] = None


class ProduktResponse(BaseModel):
    id: int
    user_id: int
    name: str
    category: str
    quantity: float
    unit: str
    barcode: Optional[str]
    image_url: Optional[str]
    added_at: datetime
    expires_at: Optional[datetime]
    status: str
    days_left: Optional[int] = None
    risk_score: Optional[float] = None
    event_id: Optional[int] = None
    event_name: Optional[str] = None

    class Config:
        from_attributes = True


class AkcjaProduktRequest(BaseModel):
    action: str  # eaten | wasted | shared
    quantity: Optional[float] = None
    weight_kg: Optional[float] = None


# --- Powiadomienia ---

class NotificationResponse(BaseModel):
    id: int
    type: str
    message: str
    item_id: Optional[int]
    created_at: datetime
    read: bool

    class Config:
        from_attributes = True


# --- Open Food Facts ---

class BarcodeLookupResponse(BaseModel):
    found: bool
    name: Optional[str] = None
    category: Optional[str] = None
    image_url: Optional[str] = None
    default_shelf_days: Optional[int] = None


class SugestiaProduktu(BaseModel):
    name: str
    category: str
    image_url: Optional[str] = None
    default_shelf_days: Optional[int] = None


# --- Dashboard ---

class DashboardStats(BaseModel):
    kg_uratowane: float
    kg_zmarnowane: float
    kg_oddane: float
    zl_zaoszczedzone: float
    co2_unikniete: float
    streak_dni: int
    wskaznik_uratowania: float
    liczba_uratowan: int
    kg_na_styk: float
    tygodniowe: List[dict]


# --- Spolecznosc ---

class DodajOgloszenieRequest(BaseModel):
    item_name: str
    quantity: float
    unit: str
    city: str
    expires_at: Optional[datetime] = None


class OgloszenieResponse(BaseModel):
    id: int
    user_id: int
    item_name: str
    quantity: float
    unit: str
    city: str
    address: Optional[str] = None
    lat: Optional[float] = None
    lon: Optional[float] = None
    status: str
    reserved_by: Optional[int] = None
    expires_at: Optional[datetime]
    created_at: datetime
    kontakt_email: Optional[str] = None
    wlasciciel_imie: Optional[str] = None
    wlasciciel_nazwisko: Optional[str] = None
    wlasciciel_nick: Optional[str] = None
    wlasciciel_znajomy: bool = False

    class Config:
        from_attributes = True


# --- Wydarzenia ---

class DodajWydarzenieRequest(BaseModel):
    name: str
    description: Optional[str] = None
    address: str
    event_at: datetime


class WydarzenieResponse(BaseModel):
    id: int
    organizer_id: int
    name: str
    description: Optional[str] = None
    address: str
    city: Optional[str] = None
    lat: Optional[float] = None
    lon: Optional[float] = None
    event_at: datetime
    status: str
    created_at: datetime
    organizator_imie: Optional[str] = None
    organizator_nazwisko: Optional[str] = None
    organizator_nick: Optional[str] = None
    organizator_znajomy: bool = False
    liczba_uczestnikow: int = 0
    czy_uczestnicze: bool = False
    czy_moje: bool = False

    class Config:
        from_attributes = True


class ProduktKrotki(BaseModel):
    item_name: str
    quantity: float
    unit: str


class UczestnikResponse(BaseModel):
    user_id: int
    imie: Optional[str] = None
    nazwisko: Optional[str] = None
    nick: Optional[str] = None
    produkty: List[ProduktKrotki] = []


class WydarzenieSzczegolyResponse(WydarzenieResponse):
    uczestnicy: List[UczestnikResponse] = []


class PrzekazProduktyRequest(BaseModel):
    pantry_item_ids: List[int]


# --- Znajomi ---

class ProfilPublicznyResponse(BaseModel):
    id: int
    imie: Optional[str] = None
    nazwisko: Optional[str] = None
    nick: Optional[str] = None
    status_znajomosci: str = "brak"  # brak | wyslane | oczekuje | znajomy

    class Config:
        from_attributes = True


class ZaproszenieResponse(BaseModel):
    id: int
    requester_id: int
    addressee_id: int
    status: str
    created_at: datetime
    profil: Optional[ProfilPublicznyResponse] = None

    class Config:
        from_attributes = True
