# EAT ME APP — ściąga pitchowa
Crusader Team · Hack4Change · Tematy: Człowiek + Natura + Technologia

## 1. INNOWACYJNOŚĆ
- Problem: ~1/3 żywności w PL ląduje w koszu — najwięcej z domowych lodówek.
- Konkurencja (Too Good To Go, Olio) ratuje jedzenie ze SKLEPÓW/restauracji.
  My jako jedyni zarządzamy TWOJĄ własną spiżarnią.
- Wyróżnik #1: ML przewiduje, co zmarnujesz, ZANIM się zepsuje (GradientBoosting, 5 cech).
- Wyróżnik #2: Claude AI — czyta paragon zdjęciem i sam dodaje produkty + generuje
  przepisy z rzeczy blisko terminu.
- Wyróżnik #3: "Tinder dla jedzenia" — swipe: zjadłem / oddałem / wyrzuciłem / +3 dni.

## 2. MODEL BIZNESOWY

**Rynek (TAM):** ~14 mln gospodarstw domowych w PL × 3 408 zł marnowanej żywności rocznie
→ ~48 mld zł marnowanego jedzenia rocznie tylko w domach. Globalny rynek zarządzania
marnowaniem żywności: 78 mld USD (2024) → 128 mld USD (2033).

**Dowód popytu:** Too Good To Go ma już 4,5 mln użytkowników i 8 100+ partnerów biznesowych
w samej Polsce — ale ratuje jedzenie tylko ze SKLEPÓW, nie z domu. My zajmujemy tę lukę.

- **B2C freemium** — apka darmowa; premium ~9,99 zł/mc (120 zł/rok): nielimitowane skany AI,
  statystyki rodzinne, więcej przepisów.
  → ROI dla usera: jeśli apka ograniczy choćby 1/3 z 3 408 zł marnowanych rocznie = ~1 100 zł
  zwrotu przy koszcie 120 zł (≈8× zwrot). Konwersja 2–3% bazy = realny przychód.
- **B2B retail** — SaaS / prowizja: skan paragonu auto-uzupełnia spiżarnię; sklepy
  (Biedronka, Lidl, Carrefour — już aktywne w tej kategorii) płacą za kupony na produkty
  blisko terminu i zanonimizowane dane koszyka.
- **Granty / ESG** — banki żywności, gminy, NGO, projekt PROM; finansowanie z grantów eko
  (UE, NFOŚiGW) i budżetów ESG firm raportujących redukcję CO₂.
- **Skala bez kosztów** — PWA = zero instalacji i zero prowizji app store (oszczędność 15–30%
  Apple/Google), działa od razu na każdym telefonie.

## 3. IMPACT (konkretne liczby)
- Każdy uratowany kg liczony per kategoria (11 kategorii) → realne CO₂ i zł.
- Przykład: mięso surowe = 13 kg CO₂ i 25 zł oszczędności na 1 uratowanym kg.
- Dashboard pokazuje userowi: kg uratowane, zł zaoszczędzone, CO₂ unikniete, streak dni bez marnowania.
- Wymiar społeczny: nadwyżki trafiają do sąsiadów / banków żywności (mapa wymiany), nie do kosza.

## 4. PREZENTACJA
- Demo na żywo: zdjęcie paragonu → produkty same wpadają do spiżarni → ML pokazuje ryzyko →
  swipe → dashboard rośnie w czasie rzeczywistym.
- To działający produkt, nie mockup: pełny flow, PWA, dopracowane UI (tryb jasny/ciemny, animacje).
- Hook na start: "Statystyczna polska rodzina wyrzuca 3 408 zł jedzenia rocznie — 165 kg do kosza.
  Eat Me pokazuje dokładnie ile i jak to zatrzymać."

## 5. ZBIEŻNOŚĆ Z TEMATEM — wszystkie 3
- NATURA: bezpośrednia redukcja marnowania żywności = mniej CO₂ i odpadów.
- CZŁOWIEK: oszczędność pieniędzy + dzielenie się jedzeniem (społeczność, znajomi, banki żywności).
- TECHNOLOGIA: ML predykcja + Claude AI (przepisy + OCR paragonów) + PWA + skan kodów kreskowych.

## + ZESPÓŁ — Crusader Team
- Jan Klimek — Product Designer, Integration Engineer
- Paweł Golda — Frontend Developer, UI Designer
- Jan Knurek — Backend Developer
- Kacper Rogala — Backend Developer

## + WYKONALNOŚĆ
- Działający MVP już teraz; stack lekki i tani (SQLite, PWA — brak kosztów dystrybucji).
- Integracje gotowe: OpenFoodFacts (baza produktów), Claude API, web push (VAPID).

## + POSTĘP NA HACKATHONIE
- Projekt powstał OD ZERA na hackathonie — cała aplikacja zbudowana tu, na miejscu.
- W tym czasie zbudowaliśmy m.in.:
  - Skanowanie paragonów z OCR AI (auto-dodawanie do spiżarni)
  - "Tinder-swipe" powiadomień o terminach
  - Dashboard impactu (kg / zł / CO₂ / streak) + wykres tygodniowy
  - Model ML predykcji ryzyka zmarnowania
  - Mapa wymiany społecznościowej + system znajomych
- Efekt: działający produkt end-to-end, nie prototyp.

## + CO DALEJ (plany rozwoju)
- Aplikacja mobilna natywna (iOS/Android) + powiadomienia push w tle.
- Integracja z paragonami e-mail / aplikacjami sklepów (Biedronka, Lidl) → spiżarnia bez skanowania.
- Rozpoznawanie produktów ze zdjęcia lodówki (computer vision) zamiast ręcznego dodawania.
- Listy zakupów generowane przez AI na podstawie nawyków + przepisów.
- Smart-lodówka / IoT: automatyczne śledzenie zawartości.
- Rozbudowa ML na realnych danych użytkowników (model uczy się Twoich nawyków marnowania).
- Grywalizacja społeczności: rankingi, odznaki, wyzwania "zero waste" dla znajomych i sąsiadów.
- Wersja dla firm/restauracji oraz panel dla banków żywności i gmin.
