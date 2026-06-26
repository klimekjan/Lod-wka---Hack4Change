import { Link } from 'react-router-dom'

export default function StronaGlowna() {
  return (
    <div className="min-h-screen min-h-[100dvh] flex flex-col">

      {/* ── HERO ─────────────────────────────────────────────────────────
          Główna sekcja ekranu startowego.
          Docelowo: tło, animacja, grafika — na razie czyste centrum. */}
      <section className="flex-1 flex flex-col items-center justify-center gap-10 px-6">

        {/* ── BRAND ──────────────────────────────────────────────────────
            Logo / nazwa aplikacji.
            Docelowo: SVG logo, font display, animacja wejścia. */}
        <div className="text-center space-y-3">
          <h1 className="text-5xl font-bold tracking-tight text-slate-900">
            Eat Me App
          </h1>
          {/* ── TAGLINE ──────────────────────────────────────────────────
              Miejsce na hasło reklamowe. */}
          <p className="text-lg text-slate-500">
            Nie marnuj jedzenia.
          </p>
        </div>

        {/* ── CTA ────────────────────────────────────────────────────────
            Przyciski akcji.
            Docelowo: animacja hover, gradient, ikony. */}
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <Link
            to="/rejestracja"
            className="btn-primary text-center text-base py-3"
          >
            Zaloguj się
          </Link>
          <Link
            to="/logowanie"
            className="btn-secondary text-center text-base py-3"
          >
            Zarejestruj się
          </Link>
        </div>

      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────
          Stopka strony głównej.
          Docelowo: linki, polityka prywatności, social media. */}
      <footer className="py-6 text-center text-xs text-slate-400">
        Eat Me App
      </footer>

    </div>
  )
}
