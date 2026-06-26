import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Settings } from 'lucide-react'
import { powiadomienia } from '../lib/api'
import { SEKCJE } from '../lib/nav'

const linki = SEKCJE.filter((s) => s.href !== '/pulpit')

export default function Navbar() {
  const { pathname } = useLocation()
  const navigate = useNavigate()

  const { data: licznik } = useQuery({
    queryKey: ['licznik-powiadomien'],
    queryFn: () => powiadomienia.licznik().then((r) => r.data.count),
    refetchInterval: 60_000,
  })

  function wyloguj() {
    localStorage.removeItem('token')
    navigate('/logowanie')
  }

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 pt-safe">
      <div className="max-w-2xl mx-auto px-4 flex items-center justify-between h-14">
        <Link to="/pulpit" className="font-bold text-zielony-700 text-lg tracking-tight shrink-0">
          Eat Me App
        </Link>

        {/* Linki — tylko desktop */}
        <div className="hidden md:flex items-center gap-1 overflow-x-auto">
          {linki.map(({ href, label }) => (
            <Link
              key={href}
              to={href}
              className={`px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
                pathname === href
                  ? 'bg-zielony-50 text-zielony-700'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              {label}
            </Link>
          ))}
          <button
            onClick={wyloguj}
            className="ml-2 text-xs text-slate-400 hover:text-slate-600 transition-colors"
          >
            wyloguj
          </button>
        </div>

        {/* Prawa strona — zawsze widoczna */}
        <div className="flex items-center gap-1">
          <Link
            to="/ustawienia"
            className={`relative p-2 rounded-md transition-colors ${
              pathname === '/ustawienia'
                ? 'text-zielony-700 bg-zielony-50'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
            aria-label="Ustawienia"
          >
            <Settings size={20} />
            {!!licznik && licznik > 0 && (
              <span className="absolute top-1 right-1 bg-red-500 text-white text-[10px] leading-none rounded-full w-4 h-4 flex items-center justify-center">
                {licznik > 9 ? '9+' : licznik}
              </span>
            )}
          </Link>
        </div>
      </div>
    </nav>
  )
}
