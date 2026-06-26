import { Link } from 'react-router-dom'
import { SEKCJE } from '../lib/nav'

const widgety = SEKCJE.filter((s) => s.pulpitWidget)

export default function Pulpit() {
  return (
    <div className="space-y-6">
      {/* Docelowo: personalizacja (imię użytkownika), pozdrowienie, data */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Witaj!</h1>
        <p className="text-sm text-slate-500 mt-1">Co chcesz dzisiaj zrobić?</p>
      </div>

      {/* Docelowo: podgląd danych w każdym widgecie, animacje wejścia, drag-and-drop */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {widgety.map((w) => (
          <Link
            key={w.href}
            to={w.href}
            className="karta flex flex-col gap-2 hover:border-zielony-300 hover:shadow-md transition-all active:scale-95"
          >
            <span className="text-zielony-600">{w.icon}</span>
            <div>
              <p className="font-semibold text-slate-800 text-sm">{w.label}</p>
              <p className="text-xs text-slate-500 mt-0.5 leading-snug">{w.opis}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
