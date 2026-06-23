# Lodówka

Aplikacja webowa (PWA) do zarządzania spiżarnią domową. Pilnuje terminów ważności, generuje przepisy z produktów na wylocie i mierzy wpływ marnowania jedzenia (kg, zł, CO₂). Projekt na hackathon Hack4Change Gdańsk 2026, temat "natura i człowiek".

## Wymagania

- Python 3.11+
- Node.js 20+
- npm 10+

## Uruchomienie

### Backend

```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate
# Linux / macOS
source .venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
# uzupełnij .env swoimi kluczami (patrz sekcja Konfiguracja)

uvicorn app.main:app --reload
```

Backend startuje na `http://localhost:8000`. Swagger: `http://localhost:8000/docs`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend startuje na `http://localhost:5173`.

Proxy w Vite kieruje `/api/*` na `localhost:8000`, więc nie trzeba ustawiać CORS ręcznie podczas developmentu.

## Konfiguracja (backend/.env)

Skopiuj `.env.example` i uzupełnij:

| Zmienna | Opis | Wymagana |
|---|---|---|
| `JWT_SECRET` | Losowy ciąg min. 32 znaki | tak |
| `ANTHROPIC_API_KEY` | Klucz Anthropic (przepisy) | tak |
| `VAPID_PRIVATE_KEY` | Klucz prywatny VAPID (Web Push) | opcjonalnie |
| `VAPID_PUBLIC_KEY` | Klucz publiczny VAPID | opcjonalnie |
| `VAPID_EMAIL` | `mailto:twoj@email.com` | opcjonalnie |
| `RESEND_API_KEY` | Klucz Resend (email) | opcjonalnie |
| `SMTP_HOST/USER/PASSWORD` | Alternatywnie SMTP zamiast Resend | opcjonalnie |

Generowanie kluczy VAPID:

```bash
cd backend
python -c "
from py_vapid import Vapid
v = Vapid()
v.generate_keys()
print('VAPID_PRIVATE_KEY=' + v.private_key.decode())
print('VAPID_PUBLIC_KEY=' + v.public_key.decode())
"
```

## Struktura projektu

```
hack4change/
├── backend/
│   ├── app/
│   │   ├── main.py          FastAPI app, CORS, startup
│   │   ├── models.py        Tabele SQLModel (SQLite)
│   │   ├── auth.py          JWT, bcrypt
│   │   ├── schemas.py       Pydantic req/resp
│   │   ├── routers/         Endpointy API
│   │   └── services/        Logika: OpenFoodFacts, Claude, ML, push
│   └── data/
│       ├── shelf_life.csv   Domyślne terminy wg kategorii (USDA FoodKeeper)
│       └── impact_factors.csv  Przeliczniki CO₂/zł wg kategorii
└── frontend/
    └── src/
        ├── pages/           Widoki (Spizarnia, Dashboard, itd.)
        ├── components/      Navbar, BarcodeScanner, karty
        └── lib/api.ts       Klient axios z JWT
```

## API (wybrane endpointy)

```
POST /api/auth/rejestruj      { email, haslo, miasto? }
POST /api/auth/login          OAuth2 form (username, password)
GET  /api/auth/mnie
PATCH /api/auth/ustawienia

GET  /api/spizarnia           ?status=active
POST /api/spizarnia
POST /api/spizarnia/{id}/akcja  { action: eaten|wasted|shared }

GET  /api/dashboard
GET  /api/przepisy/generuj    (wymaga ANTHROPIC_API_KEY)

GET  /api/spolecznosc         ?miasto=Gdańsk
POST /api/spolecznosc/{id}/zarezerwuj

GET  /api/powiadomienia
GET  /api/powiadomienia/licznik
```

## Instrukcja użytkowania

1. Otwórz `http://localhost:5173` i zarejestruj konto (podaj miasto, żeby działała tablica wymiany).
2. Na stronie Spiżarnia dodaj produkty ręcznie lub skanując kod kreskowy (przycisk Skanuj, wymaga kamery i Chrome/Edge).
   Termin ważności możesz wpisać ręcznie albo skorzystać z podpowiedzi na podstawie kategorii.
3. Spiżarnia grupuje produkty: **Przeterminowane** (czerwone), **Na wylocie** (żółte, do 3 dni), **Świeże** (zielone).
4. Na karcie produktu kliknij `···` żeby oznaczyć jako Zjedzone / Wyrzucone / Oddaj.
   Każda akcja jest logowana i zasila statystyki dashboardu.
5. Przepisy generuje Claude na podstawie produktów najbliższych terminu. Wymaga `ANTHROPIC_API_KEY`.
6. Dashboard pokazuje podsumowanie: kg uratowane, zł zaoszczędzone, CO₂ uniknięte, trend tygodniowy.
7. Wymiana: możesz wystawić produkt do oddania. Inni użytkownicy z tego samego miasta mogą go zarezerwować i dostają twój email kontaktowy.
8. Ustawienia: skonfiguruj powiadomienia push i email, próg dni przed terminem i godzinę wysyłki.

## Status implementacji

| Moduł | Status |
|---|---|
| Auth (JWT) | gotowe |
| Spiżarnia CRUD | gotowe |
| Skanowanie kodów kreskowych + Open Food Facts | Prompt 2 |
| Web Push + email (APScheduler) | Prompt 2 |
| Przepisy (Claude API) | Prompt 2 |
| Dashboard (wykresy Recharts) | Prompt 2 |
| ML (ryzyko zmarnowania, predykcja zużycia) | Prompt 3 |
| Tablica wymiany | Prompt 3 |

## Produkcja

Przed deployem ustaw `FRONTEND_URL` w `.env` na właściwy URL frontendu.
Web Push wymaga HTTPS (na localhost działa bez, na telefonie/Androidzie potrzebny tunel np. `cloudflared tunnel`).
