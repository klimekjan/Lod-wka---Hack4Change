# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Backend (run from `backend/`)
```powershell
.venv\Scripts\activate          # aktywuj venv (Windows)
uvicorn app.main:app --reload   # dev server na :8000
python data/generate_synthetic.py  # regeneruj dane treningowe ML
python -c "from app.services.ml.train import trenuj; trenuj()"  # retrenuj model
```

### Frontend (run from `frontend/`)
```powershell
npm run dev      # dev server na :5173
npm run build    # tsc + vite build
```

### Git (run from root `hack4change/`)
```powershell
git add -A && git commit -m "..." && git push
```

Swagger dostępny na `http://localhost:8000/docs` gdy backend działa.

## Architecture

### Request flow
Przeglądarka → Vite proxy (`/api/*` → `localhost:8000`) → FastAPI → SQLite (`lodowka.db`)

Vite proxy eliminuje potrzebę ustawiania CORS podczas developmentu. `redirect_slashes=False` ustawione na FastAPI app — trasy root poziomu routera definiowane jako `""` nie `"/"`.

### Backend (`backend/app/`)

**Auth** — JWT (7 dni, HS256) w `auth.py`. `hash_password`/`verify_password` używają `bcrypt` bezpośrednio (nie `passlib` — niekompatybilny z bcrypt 4.1+). Token w `Authorization: Bearer` header.

**Models** (`models.py`) — 7 tabel SQLModel na SQLite:
- `User`, `PantryItem`, `ConsumptionLog`, `ProductCache`, `PushSubscription`, `ShareListing`, `Notification`

**Routers** — każdy z prefiksem `/api/<nazwa>`:
- `pantry` → spiżarnia CRUD + akcje (eaten/wasted/shared) logujące do `ConsumptionLog`
- `dashboard` → agreguje `ConsumptionLog` × `impact_factors.csv` → kg/zł/CO₂
- `community` → tablica wymiany; `/moje` zwraca ogłoszenia zalogowanego usera
- `recipes` → wywołuje Claude Haiku, zwraca JSON z przepisem
- `notifications`, `push`, `auth`, `produkty`

**Services**:
- `openfoodfacts.py` — barcode → nazwa/kategoria, cache w `ProductCache`
- `recipes.py` — Claude `claude-haiku-4-5-20251001`, wymuszony JSON output
- `ml/predict.py` — ładuje `models/waste_risk.joblib` przy starcie (`init_models()`); `przewiduj_ryzyko()` zwraca float 0–1; fallback heurystyczny gdy brak modelu
- `ml/train.py` — GradientBoostingClassifier, dane z `data/training_data.csv`
- `notifications.py` — push (pywebpush/VAPID) + email (Resend → SMTP fallback); graceful degradation gdy brak kluczy
- `scheduler.py` — APScheduler CronTrigger 08:00 Europe/Warsaw, `sprawdz_terminy()`

**Startup sequence** (`main.py` lifespan): `init_db()` → `init_models()` → `start_scheduler()`

### Frontend (`frontend/src/`)

**State** — React Query (TanStack) dla server state. Brak globalnego store.

**API client** (`lib/api.ts`) — axios z baseURL `/api`. Interceptor dodaje `Authorization: Bearer <token>` z localStorage. 401 → redirect do `/logowanie`.

**Routing** — BrowserRouter, `PrivateRoute` wrappuje wszystkie chronione strony. Publiczne: `/logowanie`, `/rejestracja`.

**Kluczowe typy** w `api.ts`: `Produkt`, `User`, `DashboardStats` (pole `zl_zaoszczedzone`), `Ogloszenie` (pole `reserved_by`).

**Tailwind custom colors**: `zielony` (green) i `bursztyn` (amber) — zdefiniowane w `tailwind.config.js`. Custom component classes (`.karta`, `.btn-primary`, `.badge-swiezy` itp.) w `index.css`.

**PWA** — `vite-plugin-pwa` z `injectManifest`, service worker w `sw.ts`.

**BarcodeScanner** — używa natywnego `getUserMedia` + `BarcodeDetector` API (Chrome 83+). Działa tylko na HTTPS lub localhost.

### ML pipeline
1. `data/generate_synthetic.py` → `data/training_data.csv` (3000 próbek)
2. `services/ml/train.py` → `models/waste_risk.joblib`
3. `services/ml/predict.py` → `przewiduj_ryzyko(kategoria, dni_do_konca, shelf_life_dni, ilosc_znorm)`

Model ładuje się przy starcie serwera. `training_data.csv` jest w `.gitignore`; `waste_risk.joblib` jest commitowany (demo bez trenowania).

### Data files
- `data/shelf_life.csv` — kolumny: `kategoria, dni_lodowka, dni_zamrazarka, dni_szafka`
- `data/impact_factors.csv` — kolumny: `kategoria, co2_kg_per_kg, cena_pln_per_kg`

### Naming conventions
Nazwy pól i zmiennych po polsku (np. `haslo`, `miasto`, `spizarnia`, `kategoria`). Wartości techniczne po angielsku (statusy: `active/eaten/wasted/shared/available/reserved/picked_up`, akcje JWT itp.).
