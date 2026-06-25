import { Link } from 'react-router-dom'

interface Widget {
  href: string
  title: string
  opis: string
  // Docelowo: ikona SVG / komponent ikony / miniatura danych
  ikona: string
}

const WIDGETY: Widget[] = [
  {
    href: '/spizarnia',
    title: 'Spiżarnia',
    opis: 'Zarządzaj produktami i datami ważności.',
    ikona: '🥦',
  },
  {
    href: '/przepisy',
    title: 'Przepisy',
    opis: 'Propozycje dań na podstawie tego co masz.',
    ikona: '🍳',
  },
  {
    href: '/tracker',
    title: 'Tracker',
    opis: 'Śledź ile jedzenia oszczędzasz i nie marnujesz.',
    ikona: '📊',
  },
  {
    href: '/spolecznosc',
    title: 'Wymiana',
    opis: 'Oddaj lub weź produkty od innych użytkowników.',
    ikona: '🤝',
  },
  {
    href: '/ustawienia',
    title: 'Ustawienia',
    opis: 'Powiadomienia, konto i preferencje.',
    ikona: '⚙️',
  },
]

export default function Pulpit() {
  return (
    <div className="space-y-6">

      {/* ── NAGŁÓWEK ────────────────────────────────────────────────────
          Docelowo: personalizacja (imię użytkownika), pozdrowienie, data */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Witaj!</h1>
        <p className="text-sm text-slate-500 mt-1">Co chcesz dzisiaj zrobić?</p>
      </div>

      {/* ── SIATKA WIDGETÓW ─────────────────────────────────────────────
          Docelowo: podgląd danych w każdym widgecie, animacje wejścia,
          drag-and-drop kolejność, badge z liczbą produktów itp. */}
      <div className="grid grid-cols-2 gap-3">
        {WIDGETY.map((w) => (
          <Link
            key={w.href}
            to={w.href}
            className="karta flex flex-col gap-2 hover:border-zielony-300 hover:shadow-md transition-all active:scale-95"
          >
            {/* ── IKONA WIDGETU ──────────────────────────────────────────
                Docelowo: własna ikona SVG / ilustracja / miniatura wykresu */}
            <span className="text-3xl">{w.ikona}</span>

            <div>
              <p className="font-semibold text-slate-800 text-sm">{w.title}</p>
              <p className="text-xs text-slate-500 mt-0.5 leading-snug">{w.opis}</p>
            </div>
          </Link>
        ))}
      </div>

    </div>
  )
}
